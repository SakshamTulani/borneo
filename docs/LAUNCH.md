# Launch checklist

Everything that must change before real customers use Borneo. Built from DECISIONS §Production blockers, the proposed ADRs and the open decisions. **Owner** is a role until the product owner names a person. Status: **open** (not started), **ready** (code is in place behind an adapter or flag, needs the real provider or data), **decide** (needs an owner decision first).

The demo runs with `DEMO_MODE=true`; the API refuses to start with that flag in production (D-165). Turning it off makes every demo stand-in below stop working or refuse, so each one must be replaced first.

## Money and tax

| #   | Blocker                                                     | Rules              | Owner                   | Status | What is needed                                                                    | Done when                                                                     |
| --- | ----------------------------------------------------------- | ------------------ | ----------------------- | ------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Real payment gateway (UPI, cards, EMI) and refunds          | D-74, D-213        | Engineering + Finance   | ready  | Merchant account; implement `PaymentGateway` for the provider, callbacks, refunds | Test-mode payments, failures and refunds pass end to end; mock gateway unused |
| 2   | GSTIN per warehouse; HSN codes and GST rates per category   | D-209, D-210       | Finance (accountant)    | open   | Accountant confirms codes and rates; GSTINs entered per warehouse                 | Invoices carry GSTINs; "Demo invoice" text gone                               |
| 3   | GST credit notes when an invoiced order is cancelled        | D-216              | Finance + Engineering   | open   | Credit-note numbering and document                                                | A cancelled invoiced order gets a credit note                                 |
| 4   | Cash-on-delivery refunds (how the customer gets money back) | D-75 (open), D-219 | Product owner + Finance | decide | Decide the method (UPI/bank details collection)                                   | COD returns complete with a recorded refund                                   |
| 5   | COD order-value cap                                         | D-72 (open)        | Product owner           | decide | A number (the rule is a ready parameter)                                          | Cap set in config and tested                                                  |

## Identity, messages and abuse

| #   | Blocker                                                      | Rules              | Owner                 | Status | What is needed                                                                | Done when                                                     |
| --- | ------------------------------------------------------------ | ------------------ | --------------------- | ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 6   | Verified email for every purchase and flash sale             | D-94, D-141        | Engineering           | ready  | Turn on Better Auth email verification; send through the email provider       | Unverified accounts can't place orders                        |
| 7   | Real email provider behind `NotificationAdapter`             | D-104              | Engineering           | ready  | Provider account, domain (SPF/DKIM), templates for the messages the inbox has | Reset codes and order messages arrive by email; demo box gone |
| 8   | Bot protection for flash checkout                            | D-144, D-232       | Engineering           | ready  | Provider (e.g. Turnstile/hCaptcha) behind `BotProtection`                     | Flash orders need a real token                                |
| 9   | Shared rate-limit store (more than one API process)          | D-190, D-230       | Engineering           | open   | Redis or Postgres-backed limiter                                              | Limits hold across instances                                  |
| 10  | Analytics provider and a consent policy (DPDP Act)           | D-163, D-236       | Product owner + Legal | decide | Pick a provider; decide consent and retention                                 | Events reach the provider only as the policy allows           |
| 11  | Privacy policy, terms, grievance officer (Consumer/IT rules) | (not yet in rules) | Legal                 | open   | Pages and named officer                                                       | Linked from the footer                                        |

## Delivery and data

| #   | Blocker                                                           | Rules           | Owner                             | Status | What is needed                                                             | Done when                                               |
| --- | ----------------------------------------------------------------- | --------------- | --------------------------------- | ------ | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| 12  | Courier integration (booking and tracking)                        | D-166, D-215    | Operations + Eng.                 | ready  | Courier contract; implement `CourierTracking`, webhook for steps           | Orders move by courier events; demo "Advance" gone      |
| 13  | Real serviceability, lanes and a full pincode directory           | D-166, D-184    | Operations                        | open   | Courier data loaded into `serviceability`, `delivery_lane`, `pincode_area` | Every Indian pincode resolves; dates match courier SLAs |
| 14  | Returns desk (approve, reject, complete) without the demo control | D-219, D-07     | Operations + Eng.                 | decide | An internal tool or the courier/returns partner's feed                     | Requests move without the demo button                   |
| 15  | Map tiles from a provider under its usage policy                  | D-187           | Engineering                       | open   | Tile provider account and key                                              | Leaflet uses the provider                               |
| 16  | Private file storage for return photos (and invoices later)       | D-218, ADR-0009 | Product owner (accept ADR) + Eng. | decide | Accept ADR-0009; move photos to S3 with presigned URLs                     | No photo bytes in Postgres                              |
| 17  | Real product photography and catalog                              | D-180, D-15     | Product owner                     | open   | Borneo photos and final catalog data                                       | No hotlinked sample photos                              |
| 18  | Remove seeded demo reviews, demo customers and demo orders        | D-200           | Engineering                       | ready  | Production seed without them                                               | Production starts with "No reviews yet"                 |

## Platform

| #   | Blocker                                  | Rules              | Owner                             | Status | What is needed                                   | Done when                                         |
| --- | ---------------------------------------- | ------------------ | --------------------------------- | ------ | ------------------------------------------------ | ------------------------------------------------- |
| 19  | A production host for the web server     | D-175, ADR-0010    | Product owner (accept ADR) + Eng. | decide | Accept or change ADR-0010; build the server file | `pnpm build` output runs behind the reverse proxy |
| 20  | Hosting, backups, monitoring, secrets    | (not yet in rules) | Engineering                       | open   | Postgres with backups, error tracking, uptime    | Restore drill done; alerts reach a person         |
| 21  | `/design-system` reachable in production | Phase C note       | Product owner                     | decide | Gate it, or remove it from the production build  | Not publicly reachable                            |

## Checks before go-live

- `pnpm check` green, `pnpm audit:a11y` green against the production build, `pnpm perf:budget` within budget.
- `DEMO_MODE` unset; the API starts (D-165) and nothing in the UI says "Demo".
- Walk-through on a phone: search → product → cart → checkout (UPI and COD) → pay → track → return → review.
