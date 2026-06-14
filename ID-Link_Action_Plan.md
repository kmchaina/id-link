# ID-Link Tanzania — Assessment & Action Plan

*Prepared from `PROJECT_ID-Link.pdf` (rough sketch) — June 2026*

---

## 1. What the sketch gets right

- **Real, painful problem.** Replacing a lost NIDA card costs **TZS 20,000** plus a police loss report, a sworn affidavit, and weeks of waiting at a district NIDA office. Your TZS 10,000 recovery fee is literally *half the price and a fraction of the hassle* — that's the marketing message.
- **The Post Office as anchor is genuinely smart.** Tanzania Posts Corporation (TPC) has counters countrywide, idle capacity, a trusted brand, and its own courier (EMS) for the premium delivery tier.
- **Sensible tech instincts**: data masking in search results, AES-256 for ID numbers, 6-month auto-deletion, PDPA consent — all aligned with the Personal Data Protection Act, 2022.

## 2. Gaps and risks you must close (in priority order)

### 🔴 Risk 1 — Legal status of handling found government IDs (existential)
A NIDA card is government property; found IDs are customarily surrendered to the police or the issuing authority. Charging a fee to return one could be characterised as withholding government property or "ransoming" documents **unless** the service is formally blessed. Mitigation:
1. Get a written legal opinion from a Tanzanian advocate before building anything.
2. Frame the fee as a **handling/storage/notification service**, collected by/with TPC under the MoU.
3. Get a **no-objection letter from NIDA** (and ideally the Police) — this also becomes your moat: nobody else will have it.

### 🔴 Risk 2 — The claim logic has two flaws
- **Fraud**: anyone who knows a victim's ID number (employer, landlord, relative) could "claim" the card. Fix: full ID number unlock → OTP to the phone making the claim → **physical face-vs-ID-photo check by the clerk at collection**. The QR token only proves payment, not identity.
- **Recall**: most people cannot recite their 20-digit NIDA number. Offer a fallback: name + DOB + region search, with identity proven at the counter instead of online.

### 🟠 Risk 3 — No finder incentive in the monetization model
Your problem statement promises finders a "rewarded way to return" IDs, but the revenue model pays them nothing — so the supply side of your marketplace is dead on arrival. Add: **TZS 2,000 mobile-money reward per verified returned ID**, paid out of the 10,000 fee once the owner collects.

### 🟠 Risk 4 — Email-and-smartphone assumptions
Email is near-dead as a channel in Tanzania; many owners of lost IDs use feature phones. Make the system **SMS-first** (collection token by SMS, alerts by SMS) and plan a **USSD short-code search** (via Selcom or similar aggregator) as a fast follow.

### 🟡 Risk 5 — The 20/80 revenue split is a negotiation opening, not a fact
TPC will likely counter at 40–50%. Model your unit economics at 50/50 before you walk into Posta House so you know your walk-away point.

### 🟡 Risk 6 — Informal competition is free
People already post found IDs on Instagram/WhatsApp lost-and-found pages and Jamii Forums. Your edge is **trust, a physical safe zone, official partnership, and proactive alerts** — lead with that, not with the database.

---

## 3. Who to visit & where to go (the itinerary)

### Step 0 — Validate before you spend (Week 1–2, your home region)
| Visit | Why | Ask for |
|---|---|---|
| **Regional/District Postmaster** (nearest TPC regional office) | Test the partnership appetite informally before HQ | 30-min meeting; how many found IDs land at their counters today? Would clerks log them? |
| **OCD at the regional Police station** | Police are where lost IDs are reported and found IDs handed in | Volume numbers; whether they'd refer claimants to the post office |
| **A practising advocate** (data protection / commercial) | Risk 1 above | Written opinion on charging for return of government documents |

### Step 1 — Make the business legal (Weeks 2–6, mostly online)
| Institution | Where | What you get |
|---|---|---|
| **BRELA** | Online Registration System (ORS), brela.go.tz | Company/business-name registration |
| **TRA** | Regional TRA office / online | TIN + tax registration; **Lipa Namba** comes after via your bank or mobile operator |
| **PDPC** (Personal Data Protection Commission) | Online via the **RCMIS portal** (dataprotection.pdpc.go.tz) — no trip to Dodoma needed | **Data Controller certificate** — Form No. 1, ~TZS 100,000 for small entities, valid 5 years. *Mandatory before you collect a single ID — operating unregistered carries fines up to TZS 5M or imprisonment.* |

### Step 2 — The make-or-break partnership (Weeks 4–10)
| Institution | Where | Who / What |
|---|---|---|
| **Tanzania Posts Corporation HQ** | Posta House, Dar es Salaam CBD | Target the **Postmaster General's office / Director of Business Development**. Bring: 2-page concept note, revenue-share model, the regional postmaster's informal endorsement from Step 0. Goal: **MoU naming pilot branches** |
| **NIDA** | District office first; HQ is in Dodoma | No-objection letter for handling found NIDA cards; long-term goal: ID-verification API access |
| **Tanzania Police Force (regional HQ)** | Regional Police Commander's office | Letter of cooperation: police refer claimants, hand found IDs to the post office |

### Step 3 — Money and pipes (Weeks 8–12, Dar es Salaam)
| Institution | Why |
|---|---|
| **Selcom / Pesapal / AzamPay** (pick one aggregator, all have Dar offices) | One integration covers M-Pesa, Mixx by Yas (ex-Tigo Pesa), Airtel Money, Halopesa — plus SMS and USSD short-code rails. They hold the BoT licence so you don't need one. |
| **Your bank** | Business account + settlement for the aggregator |

### Step 4 — Support & funding (parallel, ongoing)
| Who | Where | Why |
|---|---|---|
| **Anza** | Arusha | Accelerator + small grants/loans for exactly this kind of TZ startup |
| **Buni Hub (COSTECH)** | Dar es Salaam | Incubation, gov-innovation connections |
| **Sahara Ventures** | Dar es Salaam | Innovation consulting, ecosystem doors |
| **UNDP FUNGUO Innovation Programme** | Calls announced online | Grant funding for impact startups — a "citizens recover their legal identity" pitch fits the governance/inclusion thesis well |
| **Tanzania Startup Association** | Online/Dar | Policy support, visibility |

### Later (post-pilot expansion of document types)
- **INEC** (voter cards), **TRA** (driving licences), **Immigration Dept** (passports), **eGA** (if you ever integrate with government systems directly).

---

## 4. Corrected roadmap (the PDF table was scrambled)

| Phase | Milestone | Duration |
|---|---|---|
| 0 | **Validation**: postmaster + police interviews, legal opinion | 2 weeks |
| 1 | **Legal & registration**: BRELA, TRA, PDPC certificate | 4 weeks (parallel with 0/2) |
| 2 | **Partnership**: TPC MoU, NIDA no-objection | 6–8 weeks (start early — slowest track) |
| 3 | **MVP build**: DB + clerk OCR logging + masked search + payments + SMS token | 8 weeks |
| 4 | **Beta**: 1–2 pilot branches, 50 dummy IDs, then ~4 weeks live with real IDs | 4–6 weeks |
| 5 | **Public launch (one region)**: signage at branches/bus terminals, radio + social, police referral posters | Launch day + 3-month pilot |
| 6 | **Scale**: more regions, USSD search, more document types | After pilot KPIs |

**Pilot KPIs**: IDs logged/month, % claimed within 30 days, fee conversion rate, fraud incidents (target: zero), TPC revenue share paid.

---

## 5. Proposed data schema (fills in the empty Part 4)

```
branches        (id, name, region, district, contact_phone)
staff           (id, branch_id, name, phone, role, status)
found_documents (id, doc_type [NIDA|VOTER|LICENCE|OTHER], full_name,
                 id_number_enc AES-256, id_number_hash SHA-256+salt -- for matching,
                 id_number_masked, dob_enc, region_found, branch_id,
                 photo_url, ocr_confidence,
                 status [LOGGED|VERIFIED|CLAIMED|COLLECTED|TRANSFERRED|EXPIRED],
                 finder_phone nullable, logged_by_staff_id,
                 created_at, collected_at, purge_after)   -- purge = collected_at + 6 months
claims          (id, document_id, claimant_phone, otp_verified_at,
                 payment_id, token_qr, token_expires_at, status)
payments        (id, claim_id, type [RECOVERY|DELIVERY|ALERT], amount_tzs,
                 gateway_ref, status, created_at)
alert_subscriptions (id, phone, id_number_hash, created_at, notified_at)
finder_rewards  (id, document_id, phone, amount_tzs, paid_at)
audit_log       (id, actor, action, entity, entity_id, at)   -- PDPA accountability
```

Key points: alerts match on **hashed** ID numbers (never plaintext); every staff action audited; `purge_after` enforced by a scheduled job.

## 6. Tech stack decision (pick one, stop hedging)

- **Frontend**: React **PWA** (mobile-first, installable, works on cheap Androids) — skip Flutter for v1; one codebase, web reach.
- **Backend**: Node.js (NestJS or Express) — or Django if the hired dev is stronger in Python. Either is fine; *deciding* is what matters.
- **DB**: PostgreSQL (as specced) with `pg_trgm` for the fuzzy name search.
- **OCR**: Google Vision API for the MVP (pay-per-call, no ML ops). Keep a **manual-entry fallback** — clerk corrects OCR output before saving; never trust raw OCR for ID numbers.
- **Messaging**: SMS via the payment aggregator's rails; email optional, never primary.
- **Hosting**: TZ-resident hosting for the database to satisfy data-residency expectations (e.g., a local cloud/colocation provider); keep an exportable architecture.

## 7. Next 14 days — concrete checklist

1. [ ] Book the regional Postmaster meeting (Step 0) — this validates everything else.
2. [ ] Same week: OCD meeting at the regional police station — get found-ID volume numbers.
3. [ ] Engage an advocate for the legal opinion on charging for ID return (Risk 1).
4. [ ] Start BRELA name reservation online (cheap, slow — start now).
5. [ ] Create the PDPC RCMIS account and read Form No. 1 requirements.
6. [ ] Rebuild the unit economics: model at 50/50 TPC split, include TZS 2,000 finder reward.
7. [ ] Draft the 2-page TPC concept note (problem → their counters earn idle revenue → pilot ask: 2 branches, 90 days).
8. [ ] Contact Anza (Arusha) about their next intake.

---
*Sources used for verified facts: PDPC registration process & fees ([pdpc.go.tz](https://www.pdpc.go.tz/en/registration-data-controller-processor/), [RCMIS portal](https://dataprotection.pdpc.go.tz/), [FB Attorneys](https://fbattorneys.co.tz/registration-for-companies-under-data-protection-law-extended/), [Rive & Co](https://www.rive.co.tz/navigating-data-privacy-compliance-in-tanzania-a-guide-to-registration-under-the-personal-data-protection-act-2022/)); NIDA replacement process & TZS 20,000 fee ([FB Attorneys](https://fbattorneys.co.tz/national-id-replacement-process/), [NIDA online services](https://services.nida.go.tz/)).*
