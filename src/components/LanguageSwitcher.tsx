import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSwitcher({ variant = 'outline' }: { variant?: 'outline' | 'ghost' }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className="gap-1.5">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{language === 'en' ? 'EN' : 'मर'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-accent' : ''}
        >
          {t('language.english')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('mr')}
          className={language === 'mr' ? 'bg-accent' : ''}
        >
          {t('language.marathi')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
