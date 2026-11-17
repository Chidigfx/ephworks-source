# Sign-in email templates

Branded versions of Supabase's sign-in emails. Their links go to **www.ephworks.com/auth/confirm**, where the app confirms
the link with Supabase (`verifyOtp`), instead of to the Supabase project address. A sender on ephworks.com linking to a
different, unknown domain looks like phishing to Gmail, and Supabase's default wording is shared with spam, so both
pushed our confirmation emails into spam.

## Install

Supabase → **Authentication → Emails → Templates**. For each template, set the subject and paste the whole file as the body:

| Template | Subject | File |
| --- | --- | --- |
| Confirm sign up | Confirm your email for Ephworks | `confirm-signup.html` |
| Reset password | Choose a new Ephworks password | `reset-password.html` |
| Change email address | Confirm your new email for Ephworks | `change-email.html` |

The links use `{{ .SiteURL }}`, so **Authentication → URL Configuration → Site URL** must be `https://www.ephworks.com`.
Deploy the app first: an older app ignores `/auth/confirm` links.

Also in **SMTP Settings**, set the sender name to `Ephworks` (one capital E).
