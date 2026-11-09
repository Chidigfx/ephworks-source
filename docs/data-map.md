# Data map

What we keep, where it's kept, who can see it and for how long. Everything below is stored in our Supabase database unless it says otherwise. Who can see what is enforced by the database itself, not just the screens.

## What we never keep

- **CVs.** Job seekers apply straight to the employer by email or the employer's careers page. CV reviews happen by email between the member and the volunteer mentor; the CV never passes through Ephworks.
- **Faith or denomination.** A church vouch is only a yes or no.
- **Payment details.** Ephworks is free and never takes money.

## What we keep

| Data | Who can see it | How long |
|---|---|---|
| **Account**: name, email, password (stored only as a hash), Google photo if used | The member. Admins see name and email. | Until the member asks us to delete it |
| **Joining**: who invited them (referral code), who approved them | Moderators and admins | Same as the account |
| **Profile extras**: display name, phone (optional) | Phone: moderators and admins only | Until the member changes or removes it |
| **Job preferences**: emirates, work type, keywords, minimum pay, email alerts on/off | Only the member. Employers never see who a job matched. | Until changed. Alert emails can be stopped with one click. |
| **Church vouch**: church, name given, note, yes/no, who decided | The member and their church's admin. Moderators see only yes/no. | Same as the account |
| **Jobs posted** | Live jobs: everyone. Waiting or rejected jobs: the poster and moderators. | Live for 30 days, then hidden. The record stays until deleted. |
| **"I'm interested"** | The member. Employers see a count, never names. | Until the member removes it, or the job is deleted |
| **Reports about a job** | Moderators | Kept after it's resolved |
| **Rejected jobs**: reason, note, company, who rejected | The poster sees the reason on their post. Moderators see a count and the last reason when the same poster or company posts again. | Kept, even if the post is edited or deleted, until the account is deleted |
| **Role applications**: volunteer or church admin | The applicant and admins | Same as the account |
| **Career support requests**: CV review, practice interview, LinkedIn help | The member and volunteer mentors. The email is shown only to the mentor who takes it. The mentor's summary when it's done: admins only, for reports. | Kept after it's done or cancelled |
| **Pastoral care requests**: kind, name given, note, church, who should see it | Only the member and the carers they chose: their own church's, or another church's. Admins, moderators, church admins and employers can't see them. | The member can erase one at any time |
| **Contact form messages**: name, email, topic, message | Admins see all messages; moderators see safety concerns only. | Until staff delete them |

## Kept outside our database

- **Saved and applied jobs**: on the member's own device (browser storage), never sent to us.
- **Emails we send** (account approval, job alerts): through our email provider, Resend, once switched on.
- **Fonts**: loaded from Google Fonts, which sees the visitor's IP address.

## Deleting data

- Members can delete pastoral care requests and "I'm interested" marks themselves.
- Anything else, including the whole account, is deleted on request through **Contact us**. Deleting an account deletes everything linked to it.
- We follow the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021).

## To fix before launch

- The Privacy page still says a pastoral request goes only to "a carer at the church you chose". It needs updating for the "carer from another church" option (with Cheryl's screens).
- There's no automatic clean-up of old expired jobs, closed requests or handled messages yet. Decide how long to keep them, e.g. 12 months.
