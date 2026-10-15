# Shop application visual update

The mint/white-card reference is used for the real Google → application → review → approval flow. There is no code-entry/OTP step or email-delivery promise. The page displays one state card, not three simultaneous live workflow panels.

Google supplies the read-only account email. Shop name is required; about/message is optional. URL slug, bank details, logo and contact remain later shop settings. Pending explicitly says the shop is not open. Existing polling/manual refresh shows approval, then scoped shop/admin links and actual subscription dates. Rejected applications can be resubmitted. Optional about text is visible to the owner, escaped as plain text. Single-click approval, authorization, tenant isolation, quotas and calendar trial logic are unchanged.

The owner dashboard keeps its existing layout. Merchant admin changes already reviewed in this draft stay in a separate commit. Application drafts/counters are restored with the existing update mechanism.

Verification: Node22 suite74/74; static52 JavaScript/3JSON; diff check clean. Five presentation regression checks cover verified read-only identity, required/optional fields, no code/slug wizard, honest pending state, scoped approved URLs/dates, rejected resubmission and escaped text. Existing approval/trial/tenant/legacy regressions pass.

The local interactive fixture preview includes login/application/pending/approved/rejected states and uses the actual stylesheet/renderer. It has no real account or API mutation. Desktop/mobile browser screenshots could not be produced: the current sandbox blocks Chrome launch. Layout is implemented with responsive CSS, but visual browser verification is still a release gate and is not claimed passed.

Draft review only. Production is unchanged. No new schema, production migration, secrets, payment data or business/legal content changes. The draft's prepared build is1.1.3; review browser rendering before release and use the established backup/CI gates.
