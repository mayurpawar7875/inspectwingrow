-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Markets policies
CREATE POLICY "Anyone can view markets" ON public.markets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage markets" ON public.markets FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Sessions policies
CREATE POLICY "Users can view their own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all sessions" ON public.sessions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Stalls policies
CREATE POLICY "Users can manage stalls in their sessions" ON public.stalls FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = stalls.session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY "Admins can view all stalls" ON public.stalls FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Media policies
CREATE POLICY "Users can manage media in their sessions" ON public.media FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = media.session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY "Admins can view all media" ON public.media FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Comments policies
CREATE POLICY "Admins can manage comments" ON public.comments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view comments on their sessions" ON public.comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = comments.session_id AND sessions.user_id = auth.uid())
);

-- Employees policies
CREATE POLICY "Admins can read all employees" ON public.employees FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all employees" ON public.employees FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read their own employee record" ON public.employees FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Public can check username for login" ON public.employees FOR SELECT USING (true);