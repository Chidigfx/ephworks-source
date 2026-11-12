# Test accounts

One account per role on the live site, so anyone on the team can test or present without a real person's details. Every name is made up. Never put real CVs, phone numbers or personal details into these accounts.

## The accounts

All eight use one inbox through "+" addresses (Gmail and Outlook both deliver `yourname+employer@gmail.com` to `yourname@gmail.com`).

| Tag | Name shown | Role | Church | Use it to show |
|---|---|---|---|---|
| `employer` | Amara Okafor | Member, vouched | St. Luke's Dubai (sample) | Posting a job, Mark as hired |
| `seeker` | Joseph Mwangi | Member | – | Browsing jobs, I'm interested, asking for a CV review or pastoral care |
| `moderator` | Priya Nair | Moderator | – | Checking and publishing jobs, rejecting with a reason |
| `churchadmin` | Ruth Thomas | Church admin | St. Luke's Dubai (sample) | Vouching and withdrawing a vouch |
| `mentor` | Grace Lim | Volunteer mentor | – | Taking a CV review, Done with a summary |
| `carer` | Esther Bello | Pastoral carer | St. Luke's Dubai (sample) | Pastoral requests from St. Luke's members, and "another church" requests from members of other churches |
| `carer2` | Miriam Haddad | Pastoral carer | Grace Fellowship Abu Dhabi (sample) | Covers "A carer from another church" for St. Luke's members |
| `admin` | Ben Carter | Admin | – | The admin dashboard, approving members |

The super admin stays your own account.

## Set them up (about 10 minutes)

1. In Supabase, open **Authentication → Users → Add user → Create new user** and add each of the eight emails, for example `yourname+employer@gmail.com`. Tick **Auto Confirm User**, so no confirmation email is needed. Give each one a password and keep the passwords in the team's password manager, not in this repo or the group chat.
2. Open the **SQL editor** and paste in [`supabase/test-accounts.sql`](../supabase/test-accounts.sql). Change `yourname@gmail.com` near the top to your inbox, then run it.
3. You should see 8 rows: every status `approved`, and `vouched` true for the employer. If a user is missing, the script stops with a list of the emails to add and changes nothing.

Running the script again is safe. It sets the same roles again and leaves the employer vouched.

## The demo on the night

1. **Amara (employer)** posts an opening.
2. **Priya (moderator)** checks it with the employer and publishes it.
3. **Joseph (seeker)** finds it, taps **I'm interested** and asks for a CV review.
4. **Grace (mentor)** takes the request, helps, and marks it **Done** with a summary.
5. **Amara** marks the job **Hired** once Joseph gets the job.

Use a separate browser profile, or a private window, for each account you need side by side.

## Good to know

- Using Add user avoids Supabase's built-in email limit (a few sign-up emails an hour), which would otherwise stop you part-way through.
- These accounts appear in the admin People list. Before real launch, delete them in **Authentication → Users**, or suspend them.
- If two-step sign-in is switched on later, the staff accounts (moderator, church admin, carers and admin) each need an authenticator app set up.
