import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users as UsersIcon, Shield, UserPlus, UserX, UserCheck } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  created_at: string;
  email?: string;
  username?: string;
  roles: string[];
}

interface UsersTabProps {
  onChangeMade: () => void;
}

export function UsersTab({ onChangeMade }: UsersTabProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    status: 'active',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, phone, status, created_at, email, username')
        .order('created_at', { ascending: false });

      if (employeesError) throw employeesError;
      if (!employees) {
        setUsers([]);
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = employees.map((employee: any) => {
        const userRoles = roles?.filter((r: any) => r.user_id === employee.id).map((r: any) => r.role) || [];
        return {
          ...employee,
          roles: userRoles,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (userId: string, role: string, currentRoles: string[]) => {
    try {
      const hasRole = currentRoles.includes(role);

      if (hasRole) {
        const { error } = await (supabase as any)
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role as any);

        if (error) {
          console.error('Delete role error:', error);
          toast.error(`Failed to remove role: ${error.message}`);
          return;
        }
        toast.success(`${role} role removed`);
      } else {
        const { error } = await (supabase as any)
          .from('user_roles')
          .insert({ user_id: userId, role: role as any });

        if (error) {
          console.error('Insert role error:', error);
          toast.error(`Failed to assign role: ${error.message}`);
          return;
        }
        toast.success(`${role} role granted`);
      }

      fetchUsers();
      onChangeMade();
    } catch (error: any) {
      console.error('Toggle role error:', error);
      toast.error(`Failed to update user role: ${error.message || 'Unknown error'}`);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('employees')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchUsers();
      onChangeMade();
    } catch (error: any) {
      toast.error('Failed to update user status');
      console.error(error);
    }
  };

  const handleAddUser = async () => {
    try {
      if (!formData.full_name || !formData.email || !formData.password || !formData.username) {
        toast.error('Please fill in all required fields');
        return;
      }

      const { data: existingUser } = await (supabase as any)
        .from('employees')
        .select('id')
        .eq('username', formData.username)
        .maybeSingle();

      if (existingUser) {
        toast.error('Username already exists. Please choose another.');
        return;
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.full_name,
            username: formData.username,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        await supabase
          .from('employees')
          .update({ 
            phone: formData.phone || null,
            status: formData.status,
            username: formData.username,
          })
          .eq('id', data.user.id);
      }

      toast.success('Employee added successfully');
      setDialogOpen(false);
      setFormData({ full_name: '', email: '', username: '', phone: '', password: '', status: 'active' });
      fetchUsers();
      onChangeMade();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add employee');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeUsers = users.filter(u => u.status === 'active');
  const inactiveUsers = users.filter(u => u.status === 'inactive');

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center gap-2">
        <div>
          <p className="text-xs md:text-sm text-muted-foreground">Manage employee accounts and permissions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-xs md:text-sm">
              <UserPlus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Add Employee</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">Add New Employee</DialogTitle>
              <DialogDescription className="text-xs md:text-sm">Create a new employee account</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 md:space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-xs md:text-sm">Full Name *</Label>
                <Input
                  id="full_name"
                  className="text-sm"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-xs md:text-sm">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  className="text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="username" className="text-xs md:text-sm">Username *</Label>
                <Input
                  id="username"
                  className="text-sm"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  placeholder="johndoe"
                />
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Username must be unique and will be used for login</p>
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs md:text-sm">Phone</Label>
                <Input
                  id="phone"
                  className="text-sm"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-xs md:text-sm">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  className="text-sm"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="status" className="text-xs md:text-sm">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-sm">Active</SelectItem>
                    <SelectItem value="inactive" className="text-sm">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddUser}>Add Employee</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2 md:gap-4 grid-cols-3">
        <Card>
          <CardHeader className="p-3 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg md:text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg md:text-2xl font-bold text-green-600">{activeUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg md:text-2xl font-bold text-red-600">{inactiveUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <UsersIcon className="h-4 w-4 md:h-5 md:w-5" />
            All Employees ({users.length})
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">View and manage employee accounts</CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="space-y-3 md:space-y-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-3 md:p-4">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm md:text-base font-semibold">{user.full_name}</h3>
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="text-[10px] md:text-xs">
                          {user.status}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground">{user.email}</p>
                      {user.username && <p className="text-xs md:text-sm text-muted-foreground">@{user.username}</p>}
                      {user.phone && <p className="text-xs md:text-sm text-muted-foreground">{user.phone}</p>}
                      <div className="flex flex-wrap gap-1 md:gap-2 mt-2">
                        {user.roles.map((role) => (
                          <Badge
                            key={role}
                            className={`text-[10px] md:text-xs ${
                              role === 'admin' ? 'bg-destructive text-destructive-foreground' :
                              role === 'bdo' ? 'bg-blue-600 text-white' :
                              role === 'bms_executive' ? 'bg-purple-600 text-white' :
                              role === 'market_manager' ? 'bg-green-600 text-white' :
                              'bg-muted'
                            }`}
                          >
                            {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        ))}
                        {user.roles.length === 0 && (
                          <Badge variant="outline" className="text-[10px] md:text-xs">No role</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs flex-1 md:flex-none"
                        onClick={() => toggleUserStatus(user.id, user.status)}
                      >
                        {user.status === 'active' ? (
                          <><UserX className="mr-1 h-3 w-3" /> <span className="hidden sm:inline">Deactivate</span><span className="sm:hidden">Off</span></>
                        ) : (
                          <><UserCheck className="mr-1 h-3 w-3" /> <span className="hidden sm:inline">Activate</span><span className="sm:hidden">On</span></>
                        )}
                      </Button>
                      <Select
                        value=""
                        onValueChange={(value) => {
                          if (value) {
                            toggleRole(user.id, value, user.roles);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[100px] md:w-[160px] text-xs">
                          <Shield className="mr-1 h-3 w-3" />
                          <span>Assign Role</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee" className="text-xs">
                            {user.roles.includes('employee') ? '✓ Remove Employee' : '+ Add Employee'}
                          </SelectItem>
                          <SelectItem value="market_manager" className="text-xs">
                            {user.roles.includes('market_manager') ? '✓ Remove Market Manager' : '+ Add Market Manager'}
                          </SelectItem>
                          <SelectItem value="bms_executive" className="text-xs">
                            {user.roles.includes('bms_executive') ? '✓ Remove BMS Executive' : '+ Add BMS Executive'}
                          </SelectItem>
                          <SelectItem value="bdo" className="text-xs">
                            {user.roles.includes('bdo') ? '✓ Remove BDO' : '+ Add BDO'}
                          </SelectItem>
                          <SelectItem value="admin" className="text-xs">
                            {user.roles.includes('admin') ? '✓ Remove Admin' : '+ Add Admin'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {users.length === 0 && (
              <div className="text-center py-8 md:py-12 text-xs md:text-sm text-muted-foreground">No employees found</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-warning">
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-sm md:text-base text-warning">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0 space-y-1 md:space-y-2 text-[10px] md:text-sm">
          <p>• Only active employees can sign in</p>
          <p>• Admin users have full system access</p>
          <p>• Default role is "employee"</p>
          <p>• Deactivating blocks login immediately</p>
          <p>• Use caution with admin privileges</p>
        </CardContent>
      </Card>
    </div>
  );
}
