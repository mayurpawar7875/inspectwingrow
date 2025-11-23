-- Manually confirm the admin user's email
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    confirmation_token = '',
    confirmation_sent_at = NULL
WHERE email = 'vrinda@wingrowagritech.com' AND email_confirmed_at IS NULL;