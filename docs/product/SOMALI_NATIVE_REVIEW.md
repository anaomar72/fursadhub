# Somali strings for native review

Every Somali (`so`) UI string added or changed by the production UI modernization
(branch `feat/production-modern-ui-redesign`, compared with `main`). They were written
alongside the English and have **not** been reviewed by a native speaker.

Please check meaning, tone and natural phrasing against the English. Placeholders such as
`{{count}}` must be kept exactly. Fix a string in `apps/web/src/locales/so/<file>`.

**680 added, 12 changed.**

## Changed strings (12)

### `admin.json`

| Key | English | Somali |
|---|---|---|
| `organizations.confirmations.reject` | The organization will be told its application was refused. This is final — a rejected organization cannot be reviewed again. | Hay’adda waxaa loo sheegayaa in codsigeeda la diiday. Tani waa kama dambays — hay’ad la diiday dib looma eegi karo. |
| `organizations.confirmations.suspend` | The organization stops operating on FursadHub straight away: its internships disappear from public view and it cannot take new candidates. There is no reinstatement from suspension — the only later step is revocation. | Hay’addu isla markiiba way joojinaysaa ka shaqaynta FursadHub: tababarradeeda waa laga qarinayaa dadweynaha, mana qaadan karto musharrixiin cusub. Hakinta laga soo celin maayo — talaabada kaliya ee dambe waa ka-noqosho. |
| `organizations.confirmations.revoke` | This permanently withdraws the organization’s verification. It cannot be undone. | Tani si joogto ah ayey uga qaadaysaa hay’adda xaqiijinteeda. Dib looma celin karo. |
| `universities.confirmations.reject` | The university will be told its application was refused. This is final — a rejected university cannot be reviewed again. | Jaamacadda waxaa loo sheegayaa in codsigeeda la diiday. Tani waa kama dambays — jaamacad la diiday dib looma eegi karo. |
| `universities.confirmations.suspend` | The university stops operating on FursadHub straight away. There is no reinstatement from suspension — the only later step is revocation. | Jaamacaddu isla markiiba way joojinaysaa ka shaqaynta FursadHub. Hakinta laga soo celin maayo — talaabada kaliya ee dambe waa ka-noqosho. |
| `universities.confirmations.revoke` | This permanently withdraws the university’s verification. It cannot be undone. | Tani si joogto ah ayey uga qaadaysaa jaamacadda xaqiijinteeda. Dib looma celin karo. |

### `common.json`

| Key | English | Somali |
|---|---|---|
| `shell.portals.organization` | Organization Portal | Bogga Ururka |

### `organization.json`

| Key | English | Somali |
|---|---|---|
| `setup.registrationNumberLabel` | Organization registration number | Lambarka diiwaangelinta ururka |

### `placements.json`

| Key | English | Somali |
|---|---|---|
| `organization.title` | Interns | Tababarayaasha |
| `organization.empty` | No interns yet. Interns are added here when a candidate accepts an internship offer. | Weli tababarayaal ma jiraan. Tababarayaasha halkan ayaa lagu daraa marka musharraxu aqbalo dalab tababar. |

### `university.json`

| Key | English | Somali |
|---|---|---|
| `setup.registrationNumberLabel` | Registration or accreditation number | Lambarka diiwaangelinta ama aqoonsiga |
| `verificationQueue.subtitle` | Enrollment claims from your students. Those waiting longest come first; open a case to review its evidence and decide. | Sheegashooyinka diiwaangelinta ardaydaada. Kuwa ugu muddada dheer sugayay ayaa marka hore yimaada; fur kiis si aad u eegto caddaynta oo aad go’aan u gaadho. |

## Added strings (680)

### `admin.json`

| Key | English | Somali |
|---|---|---|
| `nav.operations` | Operations | Hawlgallada |
| `dashboard.attention.clearTitle` | Nothing needs intervention | Wax faragelin u baahan ma jiraan |
| `dashboard.attention.clearBody` | Institution reviews, escalated cases, privacy requests and testimonials waiting for moderation will appear here. | Dib-u-eegista hay’adaha, kiisaska kor loo qaaday, codsiyada asturnaanta iyo markhaatiyada sugaya hubinta halkan ayay ka muuqan doonaan. |
| `dashboard.attention.open` | Open | Fur |
| `dashboard.attention.items.organizationReviews_one` | {{count}} organization waiting for verification review | {{count}} hay’ad ayaa sugaysa dib-u-eegis xaqiijin |
| `dashboard.attention.items.organizationReviews_other` | {{count}} organizations waiting for verification review | {{count}} hay’adood ayaa sugaya dib-u-eegis xaqiijin |
| `dashboard.attention.items.universityReviews_one` | {{count}} university waiting for verification review | {{count}} jaamacad ayaa sugaysa dib-u-eegis xaqiijin |
| `dashboard.attention.items.universityReviews_other` | {{count}} universities waiting for verification review | {{count}} jaamacadood ayaa sugaya dib-u-eegis xaqiijin |
| `dashboard.attention.items.escalatedCases_one` | {{count}} escalated student verification case | {{count}} kiis xaqiijinta arday oo kor loo qaaday |
| `dashboard.attention.items.escalatedCases_other` | {{count}} escalated student verification cases | {{count}} kiis xaqiijinta arday oo kor loo qaaday |
| `dashboard.attention.items.openPrivacyRequests_one` | {{count}} open privacy request | {{count}} codsi asturnaan oo furan |
| `dashboard.attention.items.openPrivacyRequests_other` | {{count}} open privacy requests | {{count}} codsi asturnaan oo furan |
| `dashboard.attention.items.pendingTestimonials_one` | {{count}} testimonial waiting for moderation | {{count}} markhaati ayaa sugaya hubin |
| `dashboard.attention.items.pendingTestimonials_other` | {{count}} testimonials waiting for moderation | {{count}} markhaati ayaa sugaya hubin |
| `dashboard.health.title` | Platform health | Caafimaadka madasha |
| `dashboard.health.activeAccounts` | Active accounts | Akoonnada firfircoon |
| `dashboard.health.verifiedInstitutions` | Verified institutions | Hay’adaha la xaqiijiyay |
| `dashboard.health.discoverableInternships` | Internships visible to the public | Tababarrada dadweynuhu arki karo |
| `dashboard.health.ofPublished` | of {{count}} published | ka mid ah {{count}} la daabacay |
| `dashboard.health.activePlacements` | Active placements | Meelaynta firfircoon |
| `dashboard.queue.title` | Institutions waiting for review | Hay’adaha sugaya dib-u-eegis |
| `dashboard.queue.description` | Submitted and under review, oldest document first. | La soo gudbiyay iyo dib-u-eegis ku jira, dukumentiga ugu da’da weyn marka hore. |
| `dashboard.queue.empty` | No verification cases need review. | Kiis xaqiijin oo dib-u-eegis u baahan ma jiro. |
| `dashboard.queue.partial` | Some of the queue could not be loaded; open the organization or university list to see everything. | Qayb ka mid ah safka lama soo qaadi karin; fur liiska hay’adaha ama jaamacadaha si aad wax walba u aragto. |
| `dashboard.queue.kind.organizations` | Organization | Hay’ad |
| `dashboard.queue.kind.universities` | University | Jaamacad |
| `dashboard.signals.title` | System signals | Calaamadaha nidaamka |
| `dashboard.signals.description` | Watched, not worked — neither has a queue to clear. | Waa la daawadaa, lama shaqeeyo — midkoodna saf la nadiifiyo ma laha. |
| `dashboard.signals.investigate` | Investigate | Baar |
| `dashboard.records.title` | Records by status | Diiwaannada xaaladda |
| `dashboard.records.description` | Every population FursadHub counts, split by its state. | Tiro kasta oo FursadHub tiriso, loo kala qaybiyay xaaladdeeda. |
| `organizations.confirmTitles.verify` | Verify this organization? | Ma xaqiijinaysaa hay’adtan? |
| `organizations.confirmTitles.request-changes` | Request changes? | Ma codsanaysaa isbeddel? |
| `organizations.confirmTitles.reject` | Reject this organization? | Ma diidaysaa hay’adtan? |
| `organizations.confirmTitles.suspend` | Suspend this organization? | Ma hakinaysaa hay’adtan? |
| `organizations.confirmTitles.revoke` | Revoke this verification? | Ma ka noqonaysaa xaqiijintan? |
| `organizations.done.begin-review` | Review started. | Dib-u-eegistii waa la bilaabay. |
| `organizations.done.verify` | The organization is verified. | Hay’adda waa la xaqiijiyay. |
| `organizations.done.request-changes` | Changes requested. | Isbeddel ayaa la codsaday. |
| `organizations.done.reject` | The organization was rejected. | Hay’adda waa la diiday. |
| `organizations.done.suspend` | The organization is suspended. | Hay’adda waa la hakiyay. |
| `organizations.done.revoke` | Verification revoked. | Xaqiijinta waa laga noqday. |
| `universities.confirmTitles.verify` | Verify this university? | Ma xaqiijinaysaa jaamacadtan? |
| `universities.confirmTitles.request-changes` | Request changes? | Ma codsanaysaa isbeddel? |
| `universities.confirmTitles.reject` | Reject this university? | Ma diidaysaa jaamacadtan? |
| `universities.confirmTitles.suspend` | Suspend this university? | Ma hakinaysaa jaamacadtan? |
| `universities.confirmTitles.revoke` | Revoke this verification? | Ma ka noqonaysaa xaqiijintan? |
| `universities.done.begin-review` | Review started. | Dib-u-eegistii waa la bilaabay. |
| `universities.done.verify` | The university is verified. | Jaamacadda waa la xaqiijiyay. |
| `universities.done.request-changes` | Changes requested. | Isbeddel ayaa la codsaday. |
| `universities.done.reject` | The university was rejected. | Jaamacadda waa la diiday. |
| `universities.done.suspend` | The university is suspended. | Jaamacadda waa la hakiyay. |
| `universities.done.revoke` | Verification revoked. | Xaqiijinta waa laga noqday. |
| `universities.viewDocument` | Open registration document | Fur dukumentiga diiwaangelinta |
| `escalations.done.verify` | Enrollment verified. | Diiwaangelinta waa la xaqiijiyay. |
| `escalations.done.reject` | Enrollment rejected. | Diiwaangelinta waa la diiday. |
| `escalations.done.request-more-evidence` | More evidence requested from the student. | Caddayn dheeraad ah ayaa laga codsaday ardayga. |
| `users.stateTitle` | Account state | Xaaladda akoonka |
| `users.dangerTitle` | Suspend access | Hakinta gelitaanka |
| `users.done.suspend` | Account suspended. | Akoonka waa la hakiyay. |
| `users.done.reactivate` | Account reactivated. | Akoonka dib ayaa loo hawlgeliyay. |
| `users.stateHelp.PENDING_CONTACT_VERIFICATION` | Registered, but the email address has not been verified yet. | Waa la diiwaangeliyay, laakiin ciwaanka iimaylka weli lama xaqiijin. |
| `users.stateHelp.ACTIVE` | Can sign in and use FursadHub. | Wuu geli karaa oo isticmaali karaa FursadHub. |
| `users.stateHelp.SUSPENDED` | Signed out everywhere and unable to sign in until reactivated. | Meel kasta waa laga saaray, mana geli karo ilaa dib loo hawlgeliyo. |
| `users.stateHelp.CLOSED` | Closed. It cannot be suspended or reactivated. | Waa la xiray. Lama hakin karo, dib loomana hawlgelin karo. |
| `users.platformRoles.title` | Platform roles | Doorarka madasha |
| `users.platformRoles.description` | Platform authority this account holds or has held. | Awoodda madasha ee akoonkani haysto ama hore u haystay. |
| `users.platformRoles.manage` | Manage platform roles | Maamul doorarka madasha |
| `users.platformRoles.none` | This account has never held a platform role. | Akoonkan weligiis ma haysan door madasha. |
| `users.platformRoles.since` | Since {{date}} | Laga bilaabo {{date}} |
| `users.platformRoles.revokedOn` | Revoked {{date}} | La qaaday {{date}} |
| `privacyRequests.reasonLabel` | Reason for rejecting | Sababta diidmada |
| `privacyRequests.outcomeLabel` | Outcome note | Qoraalka natiijada |
| `privacyRequests.confirm.complete` | Marking the request completed is final. Record what was done for the person. | Calaamadaynta codsiga mid la dhammeeyay waa kama dambays. Qor waxa qofka loo qabtay. |
| `privacyRequests.confirm.reject` | Rejecting is final. The person is told the request was refused, with your reason. | Diidmadu waa kama dambays. Qofka waxaa loo sheegayaa in codsiga la diiday, iyadoo la raacinayo sababtaada. |
| `privacyRequests.done.begin-review` | Review started. | Dib-u-eegistii waa la bilaabay. |
| `privacyRequests.done.complete` | Request marked completed. | Codsiga waxaa loo calaamadeeyay mid la dhammeeyay. |
| `privacyRequests.done.reject` | Request rejected. | Codsiga waa la diiday. |
| `legalDocuments.confirmTitle` | Publish this version? | Ma daabacaysaa noocan? |
| `legalDocuments.confirmBody` | {{type}} version {{version}} ({{locale}}), effective {{date}}. A published version can never be edited or deleted. | {{type}} nooca {{version}} ({{locale}}), oo dhaqan gelaya {{date}}. Nooc la daabacay weligiis lama beddeli karo lamana tirtiri karo. |
| `legalDocuments.done` | Legal document published. | Dukumentiga sharciga waa la daabacay. |
| `platformRoles.done.grant` | {{role}} role granted. | Doorka {{role}} waa la siiyay. |
| `platformRoles.done.revoke` | Platform role revoked. | Doorka madasha waa laga qaaday. |
| `platformRoles.grantConfirm.title` | Grant the {{role}} role? | Ma siinaysaa doorka {{role}}? |
| `platformRoles.grantConfirm.VERIFICATION_OFFICER` | Account {{userId}} will be able to review institution verification and escalated student cases. Nothing else in the console opens to them. | Akoonka {{userId}} wuxuu awoodi doonaa inuu dib u eego xaqiijinta hay’adaha iyo kiisaska ardayda ee kor loo qaaday. Wax kale oo konsoolka ah looma furayo. |
| `platformRoles.grantConfirm.SUPER_ADMIN` | Account {{userId}} will receive full platform authority: every account, every institution, platform roles, privacy requests and the audit trail. Grant this only to someone who must administer FursadHub. | Akoonka {{userId}} wuxuu helayaa awoodda madasha oo dhan: akoon kasta, hay’ad kasta, doorarka madasha, codsiyada asturnaanta iyo raadraaca hanti-dhawrka. Sii kaliya qof ay waajib ku tahay inuu maamulo FursadHub. |
| `verification.statusTitle` | Verification status | Xaaladda xaqiijinta |
| `verification.evidenceOnFile` | Document on file | Dukumentiga diiwaanka ku jira |
| `verification.evidenceOn` | Document {{date}} | Dukumenti {{date}} |
| `verification.registeredOn` | Registered {{date}} | La diiwaangeliyay {{date}} |
| `verification.evidenceAudited` | Opening the document is recorded in the audit trail. | Furitaanka dukumentiga waxaa lagu diiwaangeliyaa raadraaca hanti-dhawrka. |
| `verification.noEvidenceAwaiting` | No document is on file. Without one there is nothing to verify against — request changes rather than verifying. | Dukumenti diiwaanka kuma jiro. La’aantiis wax lagu xaqiijiyo ma jiro — codso isbeddel halkii aad xaqiijin lahayd. |
| `verification.withdrawTitle` | Withdraw verification | Ka noqo xaqiijinta |
| `verification.withdrawHint` | For an institution that should no longer operate on FursadHub. | Hay’ad aan mar dambe ka shaqayn karin FursadHub. |
| `verification.stateHelp.DRAFT` | Not submitted yet. Nothing for the platform to review. | Weli lama soo gudbin. Wax madashu eegto ma jiraan. |
| `verification.stateHelp.SUBMITTED` | Submitted and waiting for a reviewer. | La soo gudbiyay, wuxuuna sugayaa dib-u-eege. |
| `verification.stateHelp.UNDER_REVIEW` | Under review. Verify it, request changes, or reject it. | Dib-u-eegis ayuu ku jiraa. Xaqiiji, codso isbeddel, ama diid. |
| `verification.stateHelp.NEEDS_CHANGES` | Waiting for the institution to correct and resubmit. | Wuxuu sugayaa in hay’addu saxdo oo dib u soo gudbiso. |
| `verification.stateHelp.VERIFIED` | Verified and operating on FursadHub. | La xaqiijiyay, wuxuuna ka shaqaynayaa FursadHub. |
| `verification.stateHelp.REJECTED` | Rejected. This is final. | La diiday. Tani waa kama dambays. |
| `verification.stateHelp.SUSPENDED` | Suspended. It cannot operate; the only remaining command is revocation. | La hakiyay. Ma shaqayn karo; amarka kaliya ee haray waa ka-noqosho. |
| `verification.stateHelp.REVOKED` | Verification revoked. This is final. | Xaqiijinta waa laga noqday. Tani waa kama dambays. |
| `testimonials.done.publish` | Testimonial published. | Markhaatiga waa la daabacay. |
| `testimonials.done.unpublish` | Testimonial removed from the public site. | Markhaatiga waa laga saaray bogga dadweynaha. |
| `testimonials.done.reject` | Testimonial rejected. | Markhaatiga waa la diiday. |

### `auth.json`

| Key | English | Somali |
|---|---|---|
| `register.roleSelector.studentHint` | Find internships, apply, and follow your placement. After you sign in, your university confirms your enrollment. | Hel tababaro, codso, oo la soco meelayntaada. Markaad gasho kadib, jaamacaddaadu waxay xaqiijisaa diiwaangelintaada. |
| `register.roleSelector.organizationHint` | Publish internships and manage interns. After you sign in, you set up your organization and submit it for verification. | Daabac tababaro oo maamul ardayda tababarka ku jira. Markaad gasho kadib, waxaad diyaarisaa ururkaaga oo u gudbisaa xaqiijin. |
| `register.roleSelector.universityHint` | Verify your students and oversee their internships. After you sign in, you register your university and submit it for verification. | Xaqiiji ardaydaada oo kormeer tababarkooda. Markaad gasho kadib, waxaad diiwaangelisaa jaamacaddaada oo u gudbisaa xaqiijin. |
| `register.accountSection` | Your sign-in details | Faahfaahinta galitaankaaga |
| `register.nextStep` | Next, we’ll email you a 4-digit code to confirm your address. | Kadib, waxaan iimaylkaaga kuugu soo diri doonnaa koodh 4-tirig ah si aad u xaqiijiso cinwaankaaga. |
| `register.staffNote` | University and organization staff don’t register here — your administrator creates your account. | Shaqaalaha jaamacadaha iyo ururrada halkan iskama diiwaangeliyaan — maamulahaaga ayaa akoonkaaga sameeya. |
| `register.passwordRules.title` | Your password needs | Furahaagu wuxuu u baahan yahay |
| `register.passwordRules.length` | At least 8 characters | Ugu yaraan 8 xaraf |
| `register.passwordRules.letter` | At least one letter | Ugu yaraan hal xaraf alifbeeto ah |
| `register.passwordRules.number` | At least one number | Ugu yaraan hal lambar |
| `register.passwordRules.met` | done | waa la buuxiyay |
| `register.passwordRules.notMet` | not yet | weli lama buuxin |
| `verifyEmail.sentTo` | Code sent to | Koodhka waxaa loo diray |
| `verifyEmail.autoHint` | Enter all 4 digits — the code is checked as soon as you type the last one. | Geli dhammaan 4-ta tirig — koodhka waa la hubiyaa isla markaad qorto kan ugu dambeeya. |
| `getStarted.title` | Choose how you want to use FursadHub | Dooro sida aad u rabto inaad u isticmaasho FursadHub |
| `getStarted.subtitle` | Your account is ready. Choose what you are setting up first. | Akoonkaagu waa diyaar. Dooro waxa aad marka hore diyaarinayso. |
| `getStarted.hints.student` | Find internships, apply, and follow your placement. Your university confirms your enrollment. | Hel tababaro, codso, oo la soco meelayntaada. Jaamacaddaadu waxay xaqiijisaa diiwaangelintaada. |
| `getStarted.hints.organization` | Publish internships and manage interns. You set up your organization and submit it for verification. | Daabac tababaro oo maamul ardayda tababarka ku jira. Waxaad diyaarisaa ururkaaga oo u gudbisaa xaqiijin. |
| `getStarted.hints.university` | Verify your students and oversee their internships. You register your university and submit it for verification. | Xaqiiji ardaydaada oo kormeer tababarkooda. Waxaad diiwaangelisaa jaamacaddaada oo u gudbisaa xaqiijin. |
| `getStarted.wrongAccount` | Not the right account? | Ma aha akoonka saxda ah? |

### `common.json`

| Key | English | Somali |
|---|---|---|
| `shell.portals.universityCoordinator` | Coordinator Portal | Bogga Isku-duwaha |
| `shell.portals.universitySupervisor` | Supervisor Portal | Bogga Kormeeraha |
| `shell.portals.organizationRecruiter` | Recruiter Portal | Bogga Qorista Shaqaalaha |
| `shell.portals.organizationSupervisor` | Supervisor Portal | Bogga Kormeeraha |
| `shell.breadcrumb` | Breadcrumb | Raadka bogga |
| `status.sectionError` | This section couldn't be loaded. | Qaybtan lama soo bandhigi karin. |
| `actions.back` | Back | Dib u noqo |
| `a11y.stepCompleted` | completed | la dhammeeyay |
| `a11y.stepCurrent` | current step | tallaabada hadda |
| `a11y.stepUpcoming` | not started | weli lama bilaabin |
| `form.optional` | Optional | Ikhtiyaari |
| `home.trust.title` | Built on verification, not just listings | Lagu dhisay xaqiijin, ma aha liis keliya |
| `home.trust.items.institutions.title` | Verified institutions | Hay'ado la xaqiijiyay |
| `home.trust.items.institutions.body` | Organizations and universities go through FursadHub verification, and only verified organizations can publish internships. | Ururrada iyo jaamacaduhu waxay maraan xaqiijinta FursadHub, oo ururrada la xaqiijiyay oo keliya ayaa daabici kara tababaro. |
| `home.trust.items.enrollment.title` | Confirmed enrollment | Diiwaangelin la hubiyay |
| `home.trust.items.enrollment.body` | A student’s own university confirms their enrollment before they can apply or be nominated. | Jaamacadda ardayga ayaa xaqiijisa diiwaangelintiisa ka hor inta uusan codsan ama la magacaabin. |
| `home.trust.items.pipeline.title` | One candidate pipeline | Hal socod musharrax |
| `home.trust.items.pipeline.body` | Public applications and university nominations are reviewed together by the organization that posted the role. | Codsiyada guud iyo magacaabista jaamacadaha waxaa wada dib u eega ururka soo dhigay fursadda. |
| `home.trust.items.completion.title` | Followed to completion | La socod ilaa dhammaystir |
| `home.trust.items.completion.body` | Placements can be supervised from both the university and the organization, through weekly logs, attendance and evaluation. | Meelaynta waxaa kormeeri kara jaamacadda iyo ururkaba, iyadoo loo marayo diiwaanka toddobaadka, imaanshaha iyo qiimeynta. |
| `home.organizations.title` | Verified organizations on FursadHub | Ururrada la xaqiijiyay ee FursadHub |
| `home.latest.title` | Latest internships | Tababarada ugu dambeeyay |
| `home.latest.description` | Recently published by organizations on FursadHub. | Waxaa dhawaan daabacay ururrada ku jira FursadHub. |
| `home.latest.emptyTitle` | New internships are on their way | Tababaro cusub ayaa soo socda |
| `home.latest.emptyBody` | Opportunities appear here as soon as verified organizations publish them. | Fursaduhu halkan ayay ka muuqdaan marka ururrada la xaqiijiyay ay daabacaan. |
| `home.journey.actors` | Who takes part | Cidda ka qayb qaadata |
| `home.roles.title` | One platform, three ways in | Hal madal, saddex waddo |
| `home.lifecycle.eyebrow` | After the offer | Dalabka kadib |
| `home.lifecycle.finalReport` | Final report | Warbixinta ugu dambeysa |
| `onboarding.progressLabel` | Account setup progress | Horumarka diyaarinta akoonka |
| `onboarding.steps.account` | Account created | Akoonka waa la sameeyay |
| `onboarding.steps.email` | Email verified | Iimaylka waa la xaqiijiyay |
| `onboarding.steps.verification` | Verification | Xaqiijin |
| `verification.progressLabel` | Verification progress | Horumarka xaqiijinta |
| `verification.steps.upload` | Upload your document | Soo geli dukumeentigaaga |
| `verification.steps.submit` | Submit for review | U gudbi dib-u-eegis |
| `verification.steps.review` | FursadHub reviews it | FursadHub ayaa dib u eegaysa |
| `verification.steps.verified` | Verified | La xaqiijiyay |
| `verification.selectedFile` | Uploaded: {{name}} | La soo geliyay: {{name}} |
| `verification.statusHeading` | Status | Xaaladda |
| `lifecycle.states.complete` | completed | la dhammeeyay |
| `lifecycle.states.current` | in progress | socda |
| `lifecycle.states.attention` | needs attention | u baahan feejignaan |
| `lifecycle.states.upcoming` | not started | lama bilaabin |
| `lifecycle.states.notReached` | not reached | lama gaarin |

### `internship.json`

| Key | English | Somali |
|---|---|---|
| `weeklyLogs.reviewer.caughtUp` | No weekly log is waiting for your review. | Warbixin toddobaadle ah oo sugaysa dib-u-eegistaada ma jirto. |
| `weeklyLogs.reviewer.groups.awaiting_one` | Waiting for your review ({{count}}) | Waxay sugaysaa dib-u-eegistaada ({{count}}) |
| `weeklyLogs.reviewer.groups.awaiting_other` | Waiting for your review ({{count}}) | Waxay sugayaan dib-u-eegistaada ({{count}}) |
| `weeklyLogs.reviewer.groups.returned_one` | Returned to the student ({{count}}) | Dib loogu celiyay ardayga ({{count}}) |
| `weeklyLogs.reviewer.groups.returned_other` | Returned to the student ({{count}}) | Dib loogu celiyay ardayga ({{count}}) |
| `weeklyLogs.reviewer.groups.reviewed_one` | Reviewed ({{count}}) | La eegay ({{count}}) |
| `weeklyLogs.reviewer.groups.reviewed_other` | Reviewed ({{count}}) | La eegay ({{count}}) |
| `weeklyLogs.reviewer.groups.drafts_one` | Not submitted yet ({{count}}) | Weli lama gudbin ({{count}}) |
| `weeklyLogs.reviewer.groups.drafts_other` | Not submitted yet ({{count}}) | Weli lama gudbin ({{count}}) |
| `attendance.summaryLabel` | Attendance summary | Soo koobidda xaadirinta |
| `attendance.allSettled` | Every recorded day is settled. | Maalin kasta oo la diiwaan geliyay waa la xalliyay. |
| `attendance.awaitingSupervisor_one` | {{count}} day is awaiting your supervisor's confirmation. If a record is wrong, dispute it. | {{count}} maalin ayaa sugaysa xaqiijinta kormeerahaaga. Haddii diiwaan khaldan yahay, ka doodo. |
| `attendance.awaitingSupervisor_other` | {{count}} days are awaiting your supervisor's confirmation. If a record is wrong, dispute it. | {{count}} maalmood ayaa sugaya xaqiijinta kormeerahaaga. Haddii diiwaan khaldan yahay, ka doodo. |
| `evaluation.confirmFinal.title` | Finalize this evaluation? | Ma dhammaystiraysaa qiimayntan? |
| `evaluation.confirmFinal.body` | A final evaluation cannot be changed or reopened. It counts towards completion and the student can read it. | Qiimaynta dhammaystiran lama beddeli karo mar dambena lama furi karo. Waxay ku xisaabsantahay dhammaystirka, ardayguna wuu akhrin karaa. |
| `evaluation.confirmFinal.keep` | Not yet | Weli maya |
| `finalReport.uploading` | Uploading your report… | Warbixintaada waa la soo gelinayaa… |
| `finalReport.studentNext.MISSING` | Upload your report as a PDF, then submit it for review. | Soo geli warbixintaada PDF ahaan, kadibna u gudbi dib-u-eegis. |
| `finalReport.studentNext.DRAFT` | Your report is uploaded but not submitted. Submit it when it is final. | Warbixintaada waa la soo geliyay laakiin lama gudbin. Gudbi marka ay dhammaato. |
| `finalReport.studentNext.SUBMITTED` | Your university is reviewing your report. | Jaamacaddaadu waxay eegaysaa warbixintaada. |
| `finalReport.studentNext.NEEDS_REVISION` | Update your report using the reviewer's comment, then submit it again. | Ku cusbooneysii warbixintaada faallada dib-u-eegaha, kadibna mar kale gudbi. |
| `finalReport.studentNext.APPROVED` | Your report is approved. | Warbixintaada waa la ansixiyay. |
| `finalReport.confirmApprove.title` | Approve this final report? | Ma ansixinaysaa warbixintan kama dambaysta ah? |
| `finalReport.confirmApprove.body` | An approved report is final: it cannot be returned to the student or changed afterwards. | Warbixin la ansixiyay waa kama dambays: dib looguma celin karo ardayga, lamana beddeli karo kadib. |
| `finalReport.confirmApprove.keep` | Not yet | Weli maya |
| `defense.confirmCancel.title` | Cancel this defense? | Ma joojinaysaa difaacan? |
| `defense.confirmCancel.body` | The attempt stays in the history as cancelled. You can schedule a new one afterwards. | Isku-daygu wuxuu ku jiri doonaa taariikhda isagoo la joojiyay. Kadib waad qorshayn kartaa mid cusub. |
| `defense.confirmCancel.keep` | Keep it | Hay |

### `opportunities.json`

| Key | English | Somali |
|---|---|---|
| `list.candidates` | Candidates | Musharraxiinta |
| `form.sections.basics.title` | The internship | Tababarka |
| `form.sections.basics.description` | The title and description students see first. | Cinwaanka iyo sharaxaadda ardaydu ugu horrayn arkaan. |
| `form.sections.role.title` | The role | Doorka |
| `form.sections.role.description` | What the intern will do and what they need to bring. | Waxa tababartuhu qabanayo iyo waxa uu u baahan yahay inuu keeno. |
| `form.sections.audience.title` | Who can be considered | Cidda la tixgelin karo |
| `form.sections.audience.description` | Decides whether students apply directly, are nominated by their university, or both. | Waxay go'aamisaa in ardaydu si toos ah u codsadaan, ay jaamacaddoodu magacaabto, ama labadaba. |
| `form.sections.dates.title` | Dates and places | Taariikhaha iyo kaalmaha |
| `form.sections.dates.description` | When the internship runs, how many interns you need, and when applications close. | Goorta tababarku socdo, inta tababarte ee aad u baahan tahay, iyo goorta codsiyadu xirmaan. |
| `form.sections.arrangement.title` | Working arrangement | Habka shaqada |
| `form.sections.arrangement.description` | Where and how much the intern works. | Halka iyo inta uu tababartuhu shaqeeyo. |
| `form.sections.compensation.title` | What it offers | Waxa uu bixiyo |
| `form.sections.compensation.description` | Pay, if any, and any other benefits. | Mushahar, haddii uu jiro, iyo faa'iidooyin kale. |
| `form.targetsLater` | You choose which universities and departments to target on the internship page, after it is created. | Jaamacadaha iyo waaxaha aad bartilmaameedsanayso waxaad ka doorataa bogga tababarka, marka la abuuro kadib. |
| `form.deadlineHint` | Applications close at the end of this day. It must be before the start date. | Codsiyadu waxay xirmaan dhammaadka maalintan. Waa inay ka horreysaa taariikhda bilowga. |
| `form.deadlineHintTargeted` | Optional for a targeted internship — each university nominates by its own target deadline. | Ikhtiyaari u ah tababar la bartilmaameedsaday — jaamacad kastaa waxay magacaabtaa ilaa wakhtigeeda kama dambaysta ah. |
| `public.browseTitle` | Internships | Tababarada |
| `public.browseDescription` | Published internships from verified organizations across Somalia. | Tababarada ay daabaceen ururrada la xaqiijiyay ee Soomaaliya oo dhan. |
| `public.filtersLabel` | Filter internships | Shaandhee tababarada |
| `public.noMatchesTitle` | No internships match your search | Ma jiro tababar la jaanqaada raadintaada |
| `public.noMatchesHint` | Try a different keyword or location, or clear the filters to see every published internship. | Isku day eray ama goob kale, ama nadiifi shaandhaynta si aad u aragto dhammaan tababarada la daabacay. |
| `public.clearFilters` | Clear filters | Nadiifi shaandhaynta |
| `public.emptyTitle` | No internships are published right now | Hadda ma jiraan tababaro la daabacay |
| `public.emptyHint` | New opportunities appear here as soon as verified organizations publish them. | Fursado cusub ayaa halkan ka muuqda marka ururrada la xaqiijiyay ay daabacaan. |
| `public.keyDetails` | Key details | Faahfaahinta muhiimka ah |
| `public.closedBody` | This internship is no longer accepting applications. | Tababarkani hadda ma aqbalayo codsiyo. |
| `public.resultCount_one` | {{count}} internship | {{count}} tababar |
| `public.resultCount_other` | {{count}} internships | {{count}} tababar |
| `detail.snapshot.title` | Recruiting | Shaqaalaysiinta |
| `detail.snapshot.new` | New applications | Codsiyo cusub |
| `detail.snapshot.inReview` | In review | Dib-u-eegis ku jira |
| `detail.snapshot.offered` | Offers out | Dalabyo la diray |
| `detail.snapshot.accepted` | Accepted | La aqbalay |
| `detail.snapshot.open` | Open candidate pipeline | Fur liiska musharrixiinta |
| `detail.snapshot.unavailable` | Candidate figures could not be loaded. | Tirooyinka musharrixiinta lama soo rari karin. |
| `detail.cancelConfirm.title` | Cancel this internship? | Ma joojinaysaa tababarkan? |
| `detail.cancelConfirm.body` | Cancelling is permanent. Students can no longer apply or be nominated, and the internship cannot be published again. | Joojintu waa joogto. Ardaydu ma codsan karaan lamana magacaabi karo, tababarkana mar dambe lama daabici karo. |
| `detail.cancelConfirm.keep` | Keep it | Hayso |

### `organization.json`

| Key | English | Somali |
|---|---|---|
| `nav.sections.recruitment` | Recruitment | Shaqaalaysiinta |
| `nav.sections.internships` | Internships | Tababarrada |
| `nav.sections.organization` | Organization | Ururka |
| `setup.stepDetails` | Organization details | Faahfaahinta ururka |
| `setup.sections.identity.title` | About your organization | Ku saabsan ururkaaga |
| `setup.sections.identity.description` | How your organization is named on FursadHub. | Sida ururkaaga loogu magacaabo FursadHub. |
| `setup.sections.registration.title` | Registration details | Faahfaahinta diiwaangelinta |
| `setup.sections.registration.description` | Used for verification only. | Waxaa loo isticmaalaa xaqiijinta oo keliya. |
| `setup.sections.public.title` | Public information | Macluumaadka guud |
| `setup.sections.public.description` | You can add or change this later from your organization profile. | Mar dambe waad ku dari kartaa ama beddeli kartaa bogga ururka. |
| `setup.nextTitle` | After you create it | Marka aad samayso kadib |
| `setup.nextBody` | Your organization’s workspace opens straight away. From the organization profile, upload its registration document and submit it for verification — that is what unlocks publishing internships. | Goobta shaqada ururkaagu isla markiiba way furmaysaa. Bogga ururka ka soo geli dukumeentiga diiwaangelinta oo u gudbi xaqiijin — taasi ayaa furta daabacaadda tababarada. |
| `profile.verifiedBody` | Your organization is verified. You can publish internships. | Ururkaaga waa la xaqiijiyay. Waxaad daabici kartaa tababaro. |
| `profile.statusGuidance.DRAFT` | Attach your registration document below and submit it for verification. | Hoos ku lifaaq dukumeentiga diiwaangelinta kadibna u gudbi xaqiijinta. |
| `profile.statusGuidance.SUBMITTED` | Your submission is with FursadHub. You will be notified when the review is complete. | Codsigaagu wuxuu la joogaa FursadHub. Waa lagu wargelin doonaa marka dib-u-eegistu dhammaato. |
| `profile.statusGuidance.UNDER_REVIEW` | FursadHub is reviewing your submission. You will be notified when it is complete. | FursadHub wuxuu dib u eegayaa codsigaaga. Waa lagu wargelin doonaa marka la dhammeeyo. |
| `profile.statusGuidance.NEEDS_CHANGES` | FursadHub has asked for changes. Update your organization details or document and submit again. | FursadHub wuxuu codsaday isbeddello. Cusbooneysii faahfaahinta ururka ama dukumeentiga kadibna dib u gudbi. |
| `profile.statusGuidance.REJECTED` | Your verification was rejected. Contact FursadHub before submitting again. | Xaqiijintaadii waa la diiday. La xiriir FursadHub ka hor inta aadan dib u gudbin. |
| `profile.statusGuidance.SUSPENDED` | Your verification is suspended. Contact FursadHub to resolve it. | Xaqiijintaadu waa hakad. La xiriir FursadHub si loo xalliyo. |
| `profile.statusGuidance.REVOKED` | Your verification has been revoked. Contact FursadHub to resolve it. | Xaqiijintaadii waa la burburiyay. La xiriir FursadHub si loo xalliyo. |
| `workspace.attention.title` | Needs attention | Waxa u baahan feejignaan |
| `workspace.attention.clearTitle` | Nothing needs attention | Waxba uma baahna feejignaan |
| `workspace.attention.clearBody` | New applications, offers waiting on candidates and interns without a supervisor will appear here. | Codsiyada cusub, dalabyada sugaya musharraxiinta iyo tababartayaasha aan kormeere lahayn halkan ayay ka muuqan doonaan. |
| `workspace.attention.supervisorClearBody` | Attendance to confirm, disputes to resolve and evaluations to finish will appear here. | Xaadirinta la xaqiijinayo, khilaafaadka la xallinayo iyo qiimaynta la dhammaystirayo halkan ayay ka muuqan doonaan. |
| `workspace.attention.items.newApplications.title_one` | {{count}} new application to review | {{count}} codsi cusub oo la eegayo |
| `workspace.attention.items.newApplications.title_other` | {{count}} new applications to review | {{count}} codsiyo cusub oo la eegayo |
| `workspace.attention.items.newApplications.action` | Review | Eeg |
| `workspace.attention.items.awaitingReview.title_one` | {{count}} application under review | {{count}} codsi oo dib-u-eegis ku jira |
| `workspace.attention.items.awaitingReview.title_other` | {{count}} applications under review | {{count}} codsiyo oo dib-u-eegis ku jira |
| `workspace.attention.items.awaitingReview.action` | Continue | Sii wad |
| `workspace.attention.items.interviews.title_one` | {{count}} candidate at the interview stage | {{count}} musharrax oo heerka wareysiga ku jira |
| `workspace.attention.items.interviews.title_other` | {{count}} candidates at the interview stage | {{count}} musharraxiin oo heerka wareysiga ku jira |
| `workspace.attention.items.interviews.action` | Open | Fur |
| `workspace.attention.items.offersAwaitingCandidate.title_one` | {{count}} offer waiting for the candidate's answer | {{count}} dalab oo sugaya jawaabta musharraxa |
| `workspace.attention.items.offersAwaitingCandidate.title_other` | {{count}} offers waiting for candidates' answers | {{count}} dalabyo oo sugaya jawaabaha musharraxiinta |
| `workspace.attention.items.offersAwaitingCandidate.action` | View | Fiiri |
| `workspace.attention.items.placementsWithoutSupervisor.title_one` | {{count}} intern has no organization supervisor | {{count}} tababarte oo aan lahayn kormeere hay'adeed |
| `workspace.attention.items.placementsWithoutSupervisor.title_other` | {{count}} interns have no organization supervisor | {{count}} tababartayaal oo aan lahayn kormeere hay'adeed |
| `workspace.attention.items.placementsWithoutSupervisor.action` | Assign | Magacaab |
| `workspace.attention.items.draftsToPublish.title_one` | {{count}} draft internship not yet published | {{count}} tababar qabyo ah oo aan weli la daabicin |
| `workspace.attention.items.draftsToPublish.title_other` | {{count}} draft internships not yet published | {{count}} tababarro qabyo ah oo aan weli la daabicin |
| `workspace.attention.items.draftsToPublish.action` | Review drafts | Eeg qabyada |
| `workspace.attention.items.attendanceToConfirm.title_one` | {{count}} attendance record to confirm | {{count}} diiwaan xaadirin ah oo la xaqiijinayo |
| `workspace.attention.items.attendanceToConfirm.title_other` | {{count}} attendance records to confirm | {{count}} diiwaanno xaadirin ah oo la xaqiijinayo |
| `workspace.attention.items.attendanceToConfirm.action` | Confirm | Xaqiiji |
| `workspace.attention.items.attendanceDisputed.title_one` | {{count}} disputed attendance record to resolve | {{count}} diiwaan xaadirin oo lagu muransan yahay oo la xallinayo |
| `workspace.attention.items.attendanceDisputed.title_other` | {{count}} disputed attendance records to resolve | {{count}} diiwaanno xaadirin oo lagu muransan yahay oo la xallinayo |
| `workspace.attention.items.attendanceDisputed.action` | Resolve | Xallii |
| `workspace.attention.items.evaluationsDue.title_one` | {{count}} evaluation to finish | {{count}} qiimayn oo la dhammaystirayo |
| `workspace.attention.items.evaluationsDue.title_other` | {{count}} evaluations to finish | {{count}} qiimaynno oo la dhammaystirayo |
| `workspace.attention.items.evaluationsDue.action` | Open | Fur |
| `workspace.metrics.title` | At a glance | Hal jaleecada |
| `workspace.metrics.recruiting` | Recruiting internships | Tababarrada shaqaalaysiinaya |
| `workspace.metrics.awaitingReview` | Awaiting your review | Sugaya dib-u-eegistaada |
| `workspace.metrics.offersOut` | Offers out | Dalabyada la diray |
| `workspace.metrics.currentInterns` | Current interns | Tababartayaasha hadda jira |
| `workspace.metrics.assignedInterns` | Assigned interns | Tababartayaasha laguu xilsaaray |
| `workspace.metrics.runningNow` | Running now | Hadda socda |
| `workspace.work.candidatesTitle` | Candidates waiting on you | Musharraxiinta ku sugaya |
| `workspace.work.candidatesEmpty` | No candidate is waiting on your organization right now. | Hadda ma jiro musharrax sugaya hay'addaada. |
| `workspace.work.offersTitle` | Open offers | Dalabyada furan |
| `workspace.work.offersEmpty` | No offer is waiting for a candidate. | Ma jiro dalab sugaya musharrax. |
| `workspace.work.offerDeadline` | Answer due {{date}} | Jawaabta waxaa la rabaa {{date}} |
| `workspace.work.internshipsTitle` | Your internships | Tababarradaada |
| `workspace.work.internshipsEmpty` | No internship is recruiting right now. | Hadda ma jiro tababar shaqaalaysiinaya. |
| `workspace.work.applicants_one` | {{count}} applicant | {{count}} codsade |
| `workspace.work.applicants_other` | {{count}} applicants | {{count}} codsadayaal |
| `workspace.work.awaiting_one` | {{count}} waiting | {{count}} sugaya |
| `workspace.work.awaiting_other` | {{count}} waiting | {{count}} sugaya |
| `workspace.work.pipelineTitle` | Candidate pipeline | Habka musharraxiinta |
| `workspace.work.pipelineScope_one` | Across {{count}} recruiting internship. | {{count}} tababar oo shaqaalaysiinaya. |
| `workspace.work.pipelineScope_other` | Across {{count}} recruiting internships. | {{count}} tababarro oo shaqaalaysiinaya. |
| `workspace.work.internsTitle` | Your interns | Tababartayaashaada |
| `workspace.work.internsEmpty` | You have no assigned interns yet. Interns you supervise appear here once a placement assigns you. | Weli laguuma xilsaarin tababarte. Tababartayaasha aad kormeerto halkan ayay ka muuqdaan marka meel-dhigid laguu xilsaaro. |
| `workspace.work.internAttendance_one` | {{count}} attendance record waiting on you | {{count}} diiwaan xaadirin oo ku sugaya |
| `workspace.work.internAttendance_other` | {{count}} attendance records waiting on you | {{count}} diiwaanno xaadirin oo ku sugaya |
| `workspace.work.internEvaluation` | Evaluation not final yet | Qiimayntu weli ma dhammaystirna |
| `workspace.work.internClear` | Nothing waiting on you | Waxba kuma sugayaan |
| `workspace.work.notRunning` | Not running | Ma socdo |
| `workspace.work.partialError` | Some figures could not be loaded, so they may be incomplete. | Tirooyinka qaar lama soo rari karin, sidaa darteed waxay noqon karaan kuwo aan dhammaystirnayn. |
| `workspace.lifecycle.title` | Internship progress | Horumarka tababarka |
| `workspace.lifecycle.evaluation.MISSING` | Not started | Lama bilaabin |
| `workspace.lifecycle.evaluation.DRAFT` | Draft in progress | Qabyo socota |
| `workspace.lifecycle.evaluation.SUBMITTED` | Submitted, not final | La gudbiyay, weli ma dhammaystirna |
| `workspace.lifecycle.evaluation.FINAL` | Final | Dhammaystiran |
| `workspace.lifecycle.completionPending` | Waiting for the university’s completion decision | Waxay sugaysaa go’aanka dhammaystirka ee jaamacadda |

### `placements.json`

| Key | English | Somali |
|---|---|---|
| `student.emptyHint` | When you accept an internship offer, your internship appears here with everything you need to complete it. | Marka aad aqbasho dalab tababar, tababarkaagu halkan ayuu ka muuqan doonaa oo ay la socdaan wax kasta oo aad u baahan tahay si aad u dhammaystirto. |
| `university.student` | Student | Arday |
| `university.internship` | Internship | Tababar |
| `university.dates` | Dates | Taariikhaha |
| `university.academicSupervisor` | Academic supervisor | Kormeeraha tacliinta |
| `university.status` | Status | Xaaladda |
| `university.allStatuses` | All statuses | Dhammaan xaaladaha |
| `university.anySupervisor` | Any supervisor | Kormeere kasta |
| `university.supervisorMissing` | No academic supervisor | Kormeere tacliimeed ma jiro |
| `university.supervisorAssigned` | Assigned | La xilsaaray |
| `university.searchLabel` | Search internships | Raadi tababarrada |
| `university.searchPlaceholder` | Student, organization or internship | Arday, hay’ad ama tababar |
| `university.resultCount_one` | {{count}} internship | {{count}} tababar |
| `university.resultCount_other` | {{count}} internships | {{count}} tababar |
| `university.noMatches` | No internships match these filters | Tababar ku habboon shaandhooyinkan ma jiro |
| `university.emptyHint` | Internships appear here once one of your students accepts an offer. | Tababarradu halkan ayay ka muuqan doonaan marka mid ka mid ah ardaydaadu aqbalo dalab. |
| `university.emptySupervisorHint` | Internships appear here once you are assigned as a student’s academic supervisor. | Tababarradu halkan ayay ka muuqan doonaan marka laguu xilsaaro kormeeraha tacliinta ee arday. |
| `university.supervisorDescription` | The internships you are assigned to supervise. | Tababarrada laguu xilsaaray inaad kormeerto. |
| `organization.emptyHint` | Interns appear here once a candidate accepts an internship offer. | Tababartayaashu halkan ayay ka muuqdaan marka musharrax uu aqbalo dalab tababar. |
| `detail.unknownStudent` | Unnamed student | Arday aan magac lahayn |

### `recruitment.json`

| Key | English | Somali |
|---|---|---|
| `applications.statusGuidance.SUBMITTED` | The organization has your application. | Hay'addu way haysaa codsigaaga. |
| `applications.statusGuidance.UNDER_REVIEW` | The organization is reviewing your application. | Hay'addu waxay eegaysaa codsigaaga. |
| `applications.statusGuidance.SHORTLISTED` | You're on the shortlist. | Waxaad ku jirtaa liiska kooban. |
| `applications.statusGuidance.INTERVIEW` | You're at the interview stage. The organization will contact you. | Waxaad joogtaa heerka wareysiga. Hay'addu way kula soo xiriiri doontaa. |
| `applications.statusGuidance.OFFERED` | You have an offer. | Dalab ayaad haysataa. |
| `applications.statusGuidance.OFFER_DECLINED` | You declined the offer. | Waad diiday dalabka. |
| `applications.statusGuidance.OFFER_EXPIRED` | The offer expired before a response. | Dalabku wuu dhacay intaan jawaab la bixin. |
| `applications.statusGuidance.ACCEPTED` | You accepted. Your internship is set up. | Waad aqbashay. Tababarkaaga waa la diyaariyay. |
| `applications.statusGuidance.REJECTED` | Not selected this time. | Markan lama dooran. |
| `applications.statusGuidance.WITHDRAWN` | You withdrew this application. | Waad ka laabatay codsigan. |
| `applications.reviewOffer` | Review offer | Eeg dalabka |
| `applications.viewInternship` | View internship | Fiiri tababarka |
| `nominations.subtitle` | Nominations from your university for internships it was asked to fill. | Magacaabisyada jaamacaddaada ee tababarrada laga codsaday inay buuxiso. |
| `nominations.emptyHint` | When your university nominates you for an internship, it appears here for your consent. You do not need one to apply directly. | Marka jaamacaddaadu kuu magacaabto tababar, halkan ayay uga muuqan doontaa si aad u oggolaato. Uma baahnid magacaabis si aad si toos ah u codsato. |
| `nominations.nominatedBy` | Nominated by your university | Waxaa ku magacaabay jaamacaddaada |
| `nominations.nominatedOn` | Nominated {{date}} | La magacaabay {{date}} |
| `nominations.respondedOn` | Responded {{date}} | La jawaabay {{date}} |
| `nominations.noteLabel` | Note from your university | Qoraal ka yimid jaamacaddaada |
| `nominations.statusGuidance.ACCEPTED` | You agreed to be considered. It now appears in your applications. | Waad oggolaatay in lagu tixgeliyo. Hadda waxay ka muuqataa codsiyadaada. |
| `nominations.statusGuidance.DECLINED` | You declined. The organization was not shown your details. | Waad diiday. Hay'adda looma muujin xogtaada. |
| `nominations.statusGuidance.WITHDRAWN` | Your university withdrew this nomination. | Jaamacaddaadu way ka laabatay magacaabistan. |
| `nominations.viewApplications` | View applications | Fiiri codsiyada |
| `candidate.statusUnchanged` | Status: {{status}} | Xaaladda: {{status}} |
| `candidate.events.PLACEMENT_CREATED` | Added to your interns | Waxaa lagu daray tababarayaashaada |
| `candidate.events.SOURCE_MERGED_TO_BOTH` | Also nominated by their university | Jaamacaddiisa ayaa sidoo kale u magacawday |
| `candidate.confirmReject.title` | Reject this candidate? | Ma diidaysaa musharraxan? |
| `candidate.confirmReject.body` | Rejecting ends their candidacy for this internship. The candidate will see that they were not selected. | Diidmadu waxay soo afjartaa musharraxnimadiisa tababarkan. Musharraxu wuxuu arki doonaa in aan la dooran. |
| `candidate.confirmWithdraw.title` | Withdraw this offer? | Ma ka noqonaysaa dalabkan? |
| `candidate.confirmWithdraw.body` | The candidate can no longer accept it. You can send a new offer afterwards if the candidacy allows it. | Musharraxu mar dambe ma aqbali karo. Dalab cusub ayaad diri kartaa kadib haddii musharraxnimadu oggolaato. |
| `candidate.confirmKeep` | Go back | Dib u noqo |
| `requests.allDepartments` | All departments | Dhammaan waaxyaha |
| `requests.deadlinePassed` | Nomination deadline passed {{date}} | Waqtiga magacaabistu wuu dhaafay {{date}} |
| `requests.remaining_one` | {{count}} more nominee requested | {{count}} musharrax kale ayaa la codsaday |
| `requests.remaining_other` | {{count}} more nominees requested | {{count}} musharrax kale ayaa la codsaday |
| `requests.resultCount_one` | {{count}} request | {{count}} codsi |
| `requests.resultCount_other` | {{count}} requests | {{count}} codsi |
| `requests.workflow.label` | How nominations work | Sida magacaabistu u shaqeyso |
| `requests.workflow.request.title` | Request | Codsi |
| `requests.workflow.request.body` | An organization targets your university and asks for nominees. | Hay’ad ayaa jaamacaddaada beegsata oo codsata musharrixiin. |
| `requests.workflow.nominate.title` | Nominate | Magacaab |
| `requests.workflow.nominate.body` | You put forward verified students from eligible departments. | Waxaad soo jeedinaysaa arday la xaqiijiyay oo ka tirsan waaxyaha ku habboon. |
| `requests.workflow.consent.title` | Student agrees | Ardaygu wuu oggol yahay |
| `requests.workflow.consent.body` | Each student decides whether to be considered. | Arday kastaa wuxuu go’aansadaa inuu doonayo in la tixgeliyo. |
| `requests.workflow.recruit.title` | Recruitment | Shaqaalaysiin |
| `requests.workflow.recruit.body` | The organization reviews them alongside other candidates and decides on offers. | Hay’addu waxay la eegtaa musharrixiinta kale, waxayna go’aamisaa dalabyada. |
| `nominate.subtitle` | Put forward verified students from the eligible departments. | Soo jeedi arday la xaqiijiyay oo ka tirsan waaxyaha ku habboon. |
| `nominate.emptyHint` | Only students with a verified enrollment in an eligible department, who are available, can be nominated. | Kaliya ardayda diiwaangelintoodu la xaqiijiyay, ku jira waax ku habboon, oo diyaar ah ayaa la magacaabi karaa. |
| `nominate.closedTitle` | Nominations are closed for this request | Magacaabistu way xiran tahay codsigan |
| `nominate.closedDeadline` | The nomination deadline was {{date}}. | Waqtiga magacaabistu wuxuu ahaa {{date}}. |
| `nominate.closedStatus` | This request is no longer accepting nominations. | Codsigani mar dambe ma aqbalayo magacaabis. |
| `nominate.nominateNamed` | Nominate {{name}} | Magacaab {{name}} |
| `nominate.skills` | Skills | Xirfadaha |
| `nominate.requestTitle` | About this request | Codsigan ku saabsan |
| `nominate.status` | Status | Xaaladda |
| `nominate.nominees` | Nominees | Musharrixiinta |
| `nominate.deadline` | Nomination deadline | Waqtiga magacaabista |
| `nominate.dates` | Internship dates | Taariikhaha tababarka |
| `nominate.mode` | Sourcing | Habka raadinta |
| `nominate.departments` | Eligible departments | Waaxyaha ku habboon |
| `nominate.whatHappensTitle` | What happens after you nominate | Waxa dhaca kadib marka aad magacaabto |
| `nominate.whatHappens.consent` | The student is asked whether they want to be considered. Nothing is shared with the organization until they agree. | Ardayga waxaa la weydiinayaa inuu doonayo in la tixgeliyo. Wax lalama wadaago hay’adda ilaa uu oggolaado. |
| `nominate.whatHappens.pipeline` | If they agree, they join the organization’s candidate list for this internship. The organization decides on interviews and offers. | Haddii uu oggolaado, wuxuu ku biiraa liiska musharrixiinta hay’adda ee tababarkan. Hay’addu ayaa go’aamisa wareysiyada iyo dalabyada. |
| `nominate.whatHappens.withdraw` | You can withdraw a nomination while the student has not answered yet. | Waad ka noqon kartaa magacaabis inta ardaygu aanu weli jawaabin. |
| `universityNominations.subtitle` | Students your university has put forward, and whose move it is next. | Ardayda jaamacaddaadu soo jeedisay, iyo cidda talaabada xigta leh. |
| `universityNominations.searchLabel` | Search nominations | Raadi magacaabista |
| `universityNominations.searchPlaceholder` | Student, internship or organization | Arday, tababar ama hay’ad |
| `universityNominations.statusLabel` | Nomination status | Xaaladda magacaabista |
| `universityNominations.allStatuses` | All statuses | Dhammaan xaaladaha |
| `universityNominations.resultCount_one` | {{count}} nomination | {{count}} magacaabis |
| `universityNominations.resultCount_other` | {{count}} nominations | {{count}} magacaabis |
| `universityNominations.noMatches` | No nominations match these filters | Magacaabis ku habboon shaandhooyinkan ma jiro |
| `universityNominations.emptyHint` | Nominations appear here once you put students forward for an internship request. | Magacaabistu halkan ayay ka muuqan doontaa marka aad arday u soo jeediso codsi tababar. |
| `universityNominations.unknownStudent` | Unnamed student | Arday aan magac lahayn |
| `universityNominations.nominatedOn` | Nominated {{date}} | La magacaabay {{date}} |
| `universityNominations.respondedOn` | answered {{date}} | wuxuu jawaabay {{date}} |
| `universityNominations.withdrawNamed` | Withdraw the nomination of {{name}} | Ka noqo magacaabista {{name}} |
| `universityNominations.next.PENDING_STUDENT_CONSENT` | Waiting for the student to agree to be considered. | Waxay sugaysaa in ardaygu oggolaado in la tixgeliyo. |
| `universityNominations.next.ACCEPTED` | The student agreed and is now a candidate with the organization. | Ardaygu wuu oggolaaday, hadda waa musharrax hay’adda la jira. |
| `universityNominations.next.DECLINED` | The student chose not to be considered. | Ardaygu wuxuu doortay in aan la tixgelin. |
| `universityNominations.next.WITHDRAWN` | Withdrawn by the university. | Jaamacaddu ayaa ka noqotay. |
| `universityNominations.confirmWithdraw.title` | Withdraw this nomination? | Ma ka noqonaysaa magacaabistan? |
| `universityNominations.confirmWithdraw.body` | {{name}} will no longer be asked to be considered for {{opportunity}}. | {{name}} mar dambe looma weydiin doono in loo tixgeliyo {{opportunity}}. |
| `universityNominations.confirmWithdraw.keep` | Keep nomination | Hay magacaabista |

### `student.json`

| Key | English | Somali |
|---|---|---|
| `nav.sections.opportunities` | Opportunities | Fursadaha |
| `nav.sections.internship` | Internship | Tababarka |
| `enrollment.whyTitle` | Why your enrollment is verified | Sababta diiwaangelintaada loo xaqiijiyo |
| `enrollment.whyBody` | Only students confirmed by their own university can apply to internships or be nominated. Your university’s staff check these details against their records. | Ardayda ay xaqiijisay jaamacaddoodu oo keliya ayaa codsan kara tababaro ama la magacaabi karaa. Shaqaalaha jaamacaddaadu waxay faahfaahintan la barbar dhigaan diiwaankooda. |
| `enrollment.progressLabel` | Enrollment verification progress | Horumarka xaqiijinta diiwaangelinta |
| `enrollment.steps.details` | Enrollment details | Faahfaahinta diiwaangelinta |
| `enrollment.steps.evidence` | Student ID | Kaarka ardayga |
| `enrollment.steps.submit` | Submit | Gudbi |
| `enrollment.steps.review` | University review | Dib-u-eegista jaamacadda |
| `enrollment.steps.verified` | Verified | La xaqiijiyay |
| `enrollment.statusMeaning.DRAFT` | Your details are saved but not yet sent to your university. Upload your student ID, then submit. | Faahfaahintaada waa la keydiyay laakiin weli looma dirin jaamacaddaada. Soo geli kaarka ardaygaaga, kadib gudbi. |
| `enrollment.statusMeaning.NEEDS_MORE_EVIDENCE` | Your university needs more evidence before it can decide. Read the note below, upload a clearer or different document, then resubmit. | Jaamacaddaadu waxay u baahan tahay caddayn dheeraad ah ka hor inta aysan go’aan gaarin. Akhri qoraalka hoose, soo geli dukumeenti cad ama ka duwan, kadib dib u gudbi. |
| `enrollment.statusMeaning.REJECTED` | Your university could not confirm this enrollment. Contact your university’s internship office if you think this is a mistake. | Jaamacaddaadu ma xaqiijin karin diiwaangelintan. La xiriir xafiiska tababarka jaamacaddaada haddii aad u malaynayso inay khalad tahay. |
| `enrollment.statusMeaning.REVOKED` | Your university has withdrawn this verification. Contact your university’s internship office to resolve it. | Jaamacaddaadu way kala noqotay xaqiijintan. La xiriir xafiiska tababarka jaamacaddaada si loo xalliyo. |
| `enrollment.reviewerNote` | Note from your university | Qoraal ka yimid jaamacaddaada |
| `enrollment.whileWaiting` | While you wait, you can complete your profile and browse internships. Applying opens once your enrollment is verified. | Inta aad sugeyso, waad dhammaystiri kartaa astaantaada oo daalacan kartaa tababarada. Codsashadu waxay furantaa marka diiwaangelintaada la xaqiijiyo. |
| `journey.eyebrow` | Where you are | Halka aad joogto |
| `journey.stages.placementActive.title` | Your internship is active | Tababarkaagu waa socdaa |
| `journey.stages.placementActive.body` | Keep your logs, attendance and report up to date — everything for this internship is in one place. | Cusbooneysii diiwaannadaada, xaadirintaada iyo warbixintaada — wax kasta oo tababarkan ku saabsan hal meel ayay ku yaallaan. |
| `journey.stages.placementPlanned.title` | Your internship is confirmed | Tababarkaaga waa la xaqiijiyay |
| `journey.stages.placementPlanned.body` | It starts on {{date}}. Your host organization starts it in FursadHub on your first day. | Wuxuu bilaabanayaa {{date}}. Hay'adda martigelisay ayaa ka bilaabaysa FursadHub maalintaada ugu horraysa. |
| `journey.stages.completionPending.title` | Your internship is being reviewed for completion | Tababarkaaga waxaa loo eegayaa dhammaystirka |
| `journey.stages.completionPending.body` | Your university is checking the completion requirements. You will be notified when it is complete. | Jaamacaddaadu waxay hubinaysaa shuruudaha dhammaystirka. Waa lagu wargelin doonaa marka uu dhammaado. |
| `journey.stages.offerWaiting.title` | You have an internship offer waiting | Dalab tababar ayaa ku sugaya |
| `journey.stages.offerWaiting.body` | Review the offer and respond before {{date}}. Only you can accept or decline it. | Eeg dalabka oo ka jawaab ka hor {{date}}. Adiga oo keliya ayaa aqbali kara ama diidi kara. |
| `journey.stages.nominationWaiting.title` | Your university nominated you | Jaamacaddaadu way ku magacaabtay |
| `journey.stages.nominationWaiting.body` | The organization sees your nomination only after you agree to be considered. | Hay'addu ma arkayso magacaabistaada ilaa aad oggolaato in lagu tixgeliyo. |
| `journey.stages.enrollmentMissing.title` | Start by claiming your university enrollment | Ku bilow inaad sheegato diiwaangelintaada jaamacadeed |
| `journey.stages.enrollmentMissing.body` | Your university confirms you are their student. Until then you can browse, but not apply or be nominated. | Jaamacaddaadu waxay xaqiijisaa inaad ardaygeeda tahay. Ilaa markaas waad daalacan kartaa, laakiin ma codsan kartid lamana magacaabi karo. |
| `journey.stages.enrollmentIncomplete.title` | Finish your enrollment | Dhammaystir diiwaangelintaada |
| `journey.stages.enrollmentIncomplete.body` | Add your student ID and submit it so your university can confirm your enrollment. | Ku dar kaarka ardayga oo gudbi si jaamacaddaadu u xaqiijiso diiwaangelintaada. |
| `journey.stages.enrollmentChangesRequested.title` | Your university asked for more evidence | Jaamacaddaadu waxay codsatay caddayn dheeraad ah |
| `journey.stages.enrollmentChangesRequested.body` | Read their note, update your student ID, and submit again. | Akhri qoraalkooda, cusbooneysii kaarka ardayga, oo mar kale gudbi. |
| `journey.stages.enrollmentInReview.title` | Your university is reviewing your enrollment | Jaamacaddaadu waxay eegaysaa diiwaangelintaada |
| `journey.stages.enrollmentInReview.body` | There is nothing you need to do right now. You can browse internships while you wait; applying opens once you are verified. | Hadda waxba lagaama rabo. Inta aad sugayso waad daalacan kartaa tababarrada; codsigu wuxuu furmayaa marka lagu xaqiijiyo. |
| `journey.stages.enrollmentClosed.title` | Your enrollment is not verified | Diiwaangelintaada lama xaqiijin |
| `journey.stages.enrollmentClosed.body` | Your university did not confirm your enrollment. Read their note on the enrollment page. | Jaamacaddaadu ma xaqiijin diiwaangelintaada. Akhri qoraalkooda bogga diiwaangelinta. |
| `journey.stages.applicationsInProgress.title` | Your applications are in progress | Codsiyadaadu waa socdaan |
| `journey.stages.applicationsInProgress.body` | Organizations are reviewing them. You will be notified when something changes. | Hay'aduhu waa eegayaan. Waa lagu wargelin doonaa marka wax isbeddelaan. |
| `journey.stages.completed.title` | You completed your internship | Waad dhammaysay tababarkaaga |
| `journey.stages.completed.body` | Congratulations. Your internship record stays available here. | Hambalyo. Diiwaanka tababarkaagu halkan ayuu ku sii jirayaa. |
| `journey.stages.readyToApply.title` | You're ready to apply | Waad diyaar u tahay inaad codsato |
| `journey.stages.readyToApply.body` | Your enrollment is verified. Find an internship that fits you and apply. | Diiwaangelintaada waa la xaqiijiyay. Hel tababar kugu habboon oo codso. |
| `journey.actions.browse` | Browse internships | Raadi tababarro |
| `journey.actions.enrollment` | Continue enrollment | Sii wad diiwaangelinta |
| `journey.actions.viewEnrollment` | View enrollment | Fiiri diiwaangelinta |
| `journey.actions.applications` | View applications | Fiiri codsiyada |
| `journey.actions.openInternship` | Open internship | Fur tababarka |
| `journey.actions.viewInternship` | View internship | Fiiri tababarka |
| `journey.actions.reviewOffer` | Review offer | Eeg dalabka |
| `journey.actions.respondNomination` | Respond to nomination | Ka jawaab magacaabista |
| `journey.placementMeta` | {{organization}} · {{start}} – {{end}} | {{organization}} · {{start}} – {{end}} |
| `journey.attention.title` | Needs your attention | Waxa u baahan feejignaantaada |
| `journey.attention.clearTitle` | Nothing needs your attention | Waxba uma baahna feejignaantaada |
| `journey.attention.clearBody` | You're up to date. New requests from your university or organizations will appear here. | Wax walba waa la cusbooneysiiyay. Codsiyada cusub ee jaamacaddaada ama hay'adaha halkan ayay ka muuqan doonaan. |
| `journey.attention.open` | Open | Fur |
| `journey.attention.items.offer.title` | Respond to the offer for {{title}} | Ka jawaab dalabka {{title}} |
| `journey.attention.items.offer.meta` | Respond by {{date}} | Ka jawaab ka hor {{date}} |
| `journey.attention.items.offer.action` | Review offer | Eeg dalabka |
| `journey.attention.items.nomination.title` | Agree to be considered for {{title}} | Oggolow in lagu tixgeliyo {{title}} |
| `journey.attention.items.nomination.titleNoOpportunity` | Agree to be considered for a nomination | Oggolow in lagu tixgeliyo magacaabis |
| `journey.attention.items.nomination.meta` | {{organization}} | {{organization}} |
| `journey.attention.items.nomination.action` | Respond | Ka jawaab |
| `journey.attention.items.enrollment.missing.title` | Claim your university enrollment | Sheego diiwaangelintaada jaamacadeed |
| `journey.attention.items.enrollment.missing.meta` | Needed to apply or be nominated | Waxaa loo baahan yahay si aad u codsato ama laguu magacaabo |
| `journey.attention.items.enrollment.incomplete.title` | Submit your enrollment for verification | U gudbi diiwaangelintaada xaqiijin |
| `journey.attention.items.enrollment.incomplete.meta` | Add your student ID, then submit | Ku dar kaarka ardayga, kadibna gudbi |
| `journey.attention.items.enrollment.changesRequested.title` | Your university asked for more evidence | Jaamacaddaadu waxay codsatay caddayn dheeraad ah |
| `journey.attention.items.enrollment.changesRequested.meta` | Update your student ID and submit again | Cusbooneysii kaarka ardayga oo mar kale gudbi |
| `journey.attention.items.enrollment.action` | Open | Fur |
| `journey.attention.items.weeklyLogReturned.title` | Week {{week}} log was returned for changes | Diiwaanka toddobaadka {{week}} waa laguu soo celiyay si aad wax uga beddesho |
| `journey.attention.items.weeklyLogReturned.meta` | Read your supervisor's comment and resubmit | Akhri faallada kormeerahaaga oo dib u gudbi |
| `journey.attention.items.weeklyLogReturned.action` | Open log | Fur diiwaanka |
| `journey.attention.items.finalReportRevision.title` | Your final report needs revision | Warbixintaada ugu dambaysa waxay u baahan tahay dib-u-eegis |
| `journey.attention.items.finalReportRevision.meta` | Read the reviewer's comment, update and resubmit | Akhri faallada dib-u-eegaha, cusbooneysii oo dib u gudbi |
| `journey.attention.items.finalReportRevision.action` | Open report | Fur warbixinta |
| `journey.attention.items.defenseScheduled.title` | Your defense is scheduled | Difaacaaga waa la qorsheeyay |
| `journey.attention.items.defenseScheduled.meta` | {{date}} | {{date}} |
| `journey.attention.items.defenseScheduled.metaWithLocation` | {{date}} · {{location}} | {{date}} · {{location}} |
| `journey.attention.items.defenseScheduled.action` | Details | Faahfaahin |
| `journey.lifecycle.title` | Your internship journey | Socdaalka tababarkaaga |
| `journey.lifecycle.label` | Internship progress | Horumarka tababarka |
| `journey.lifecycle.requirementsGroup` | Requirements — in any order | Shuruudaha — siday doonto ha u kala horreeyaan |
| `journey.lifecycle.noRequirements` | Your university requires nothing beyond the internship itself. | Jaamacaddaadu wax kale kama rabto marka laga reebo tababarka laftiisa. |
| `journey.lifecycle.unavailable` | Requirements could not be loaded. Open the internship to see them. | Shuruudaha lama soo rari karin. Fur tababarka si aad u aragto. |
| `journey.lifecycle.steps.placement` | Placement confirmed | Meel dhigidda waa la xaqiijiyay |
| `journey.lifecycle.steps.started` | Internship started | Tababarku wuu bilaabmay |
| `journey.lifecycle.steps.WEEKLY_LOGS` | Weekly logs | Diiwaanka toddobaadka |
| `journey.lifecycle.steps.ATTENDANCE` | Attendance | Xaadirinta |
| `journey.lifecycle.steps.ORGANIZATION_EVALUATION` | Organization evaluation | Qiimaynta hay'adda |
| `journey.lifecycle.steps.FINAL_REPORT` | Final report | Warbixinta ugu dambaysa |
| `journey.lifecycle.steps.DEFENSE` | Defense | Difaaca |
| `journey.lifecycle.steps.completion` | Completion | Dhammaystirka |
| `journey.lifecycle.details.startsOn` | Starts {{date}} | Wuxuu bilaabanayaa {{date}} |
| `journey.lifecycle.details.startedOn` | Started {{date}} | Wuxuu bilaabmay {{date}} |
| `journey.lifecycle.details.notStarted` | Not started | Lama bilaabin |
| `journey.lifecycle.details.weeklyLogs` | {{done}} of {{total}} weeks reviewed | {{done}} ka mid ah {{total}} toddobaad ayaa la eegay |
| `journey.lifecycle.details.attendance` | {{done}} of {{total}} days settled | {{done}} ka mid ah {{total}} maalmood ayaa la xalliyay |
| `journey.lifecycle.details.evaluation.MISSING` | Not started by your supervisor | Kormeerahaagu weli ma bilaabin |
| `journey.lifecycle.details.evaluation.DRAFT` | Your supervisor is writing it | Kormeerahaagu wuu qorayaa |
| `journey.lifecycle.details.evaluation.SUBMITTED` | Submitted by your supervisor | Kormeerahaagu wuu gudbiyay |
| `journey.lifecycle.details.evaluation.FINAL` | Finalized | Waa la dhammaystiray |
| `journey.lifecycle.details.finalReport.MISSING` | Not started | Lama bilaabin |
| `journey.lifecycle.details.finalReport.DRAFT` | Draft | Qabyo |
| `journey.lifecycle.details.finalReport.SUBMITTED` | Submitted for review | Waxaa loo gudbiyay dib-u-eegis |
| `journey.lifecycle.details.finalReport.NEEDS_REVISION` | Needs revision | Dib-u-eegis ayaa la codsaday |
| `journey.lifecycle.details.finalReport.APPROVED` | Approved | La ansixiyay |
| `journey.lifecycle.details.defense.MISSING` | Not scheduled yet | Weli lama qorsheyn |
| `journey.lifecycle.details.defense.NOT_PASSED` | Not passed yet | Weli lama gudbin |
| `journey.lifecycle.details.defense.PASSED` | Passed | Waa la gudbay |
| `journey.lifecycle.details.completionPending` | Your university is reviewing completion | Jaamacaddaadu waxay eegaysaa dhammaystirka |
| `journey.lifecycle.details.completedOn` | Completed {{date}} | La dhammeeyay {{date}} |
| `journey.lifecycle.details.ended` | This internship ended early | Tababarkani goor hore ayuu dhammaaday |
| `journey.road.title` | Your road to an internship | Jidkaaga tababarka |
| `journey.road.label` | Steps to an internship | Tallaabooyinka tababarka |
| `journey.road.steps.enrollment` | Verified enrollment | Diiwaangelin la xaqiijiyay |
| `journey.road.steps.apply` | Apply, or accept a nomination | Codso, ama aqbal magacaabis |
| `journey.road.steps.offer` | Receive and accept an offer | Hel oo aqbal dalab |
| `journey.road.steps.placement` | Start your internship | Bilow tababarkaaga |
| `journey.recruitment.title` | Applications and nominations | Codsiyada iyo magacaabisyada |
| `journey.recruitment.empty` | No applications or nominations yet. | Weli ma jiraan codsiyo ama magacaabisyo. |
| `journey.recruitment.emptyHint` | Applications you submit, and nominations from your university, will appear here. | Codsiyada aad gudbiso iyo magacaabisyada jaamacaddaada halkan ayay ka muuqan doonaan. |
| `journey.recruitment.nominated` | Nomination | Magacaabis |
| `journey.recruitment.viewApplications` | All applications | Dhammaan codsiyada |
| `journey.recruitment.viewNominations` | All nominations | Dhammaan magacaabisyada |

### `university.json`

| Key | English | Somali |
|---|---|---|
| `nav.sections.students` | Students | Ardayda |
| `nav.sections.nominations` | Nominations | Magacaabista |
| `nav.sections.internships` | Internships | Tababarrada |
| `nav.sections.university` | University | Jaamacadda |
| `setup.stepDetails` | University details | Faahfaahinta jaamacadda |
| `setup.sections.identity.title` | About your university | Ku saabsan jaamacaddaada |
| `setup.sections.identity.description` | How your university is named on FursadHub. | Sida jaamacaddaada loogu magacaabo FursadHub. |
| `setup.sections.registration.title` | Registration details | Faahfaahinta diiwaangelinta |
| `setup.sections.registration.description` | Used for verification only. | Waxaa loo isticmaalaa xaqiijinta oo keliya. |
| `setup.sections.public.title` | Public information | Macluumaadka guud |
| `setup.sections.public.description` | You can add or change this later from your university profile. | Mar dambe waad ku dari kartaa ama beddeli kartaa bogga jaamacadda. |
| `setup.nextTitle` | After you register it | Marka aad diiwaangeliso kadib |
| `setup.nextBody` | Your university’s workspace opens straight away. From the university profile, upload its registration or accreditation document and submit it for verification — organizations can target your university with internships once it is verified. | Goobta shaqada jaamacaddaadu isla markiiba way furmaysaa. Bogga jaamacadda ka soo geli dukumeentiga diiwaangelinta ama aqoonsiga oo u gudbi xaqiijin — ururradu waxay jaamacaddaada ku beegsan karaan tababaro marka la xaqiijiyo. |
| `profile.verificationRestrictions` | Until your university is verified, organizations cannot target it with internship opportunities. You can keep setting up your workspace in the meantime. | Ilaa jaamacaddaada la xaqiijiyo, ururradu kuma beegsan karaan fursado tababar. Inta lagu jiro waad sii wadi kartaa diyaarinta goobtaada shaqada. |
| `profile.verifiedBody` | Your university is verified. Organizations can target it with internship opportunities. | Jaamacaddaada waa la xaqiijiyay. Ururradu waxay ku beegsan karaan fursado tababar. |
| `profile.statusGuidance.DRAFT` | Attach your registration or accreditation document below and submit it for verification. | Hoos ku lifaaq dukumeentiga diiwaangelinta ama aqoonsiga kadibna u gudbi xaqiijinta. |
| `profile.statusGuidance.SUBMITTED` | Your submission is with FursadHub. You will be notified when the review is complete. | Codsigaagu wuxuu la joogaa FursadHub. Waa lagu wargelin doonaa marka dib-u-eegistu dhammaato. |
| `profile.statusGuidance.UNDER_REVIEW` | FursadHub is reviewing your submission. You will be notified when it is complete. | FursadHub wuxuu dib u eegayaa codsigaaga. Waa lagu wargelin doonaa marka la dhammeeyo. |
| `profile.statusGuidance.NEEDS_CHANGES` | FursadHub has asked for changes. Update your university details or document and submit again. | FursadHub wuxuu codsaday isbeddello. Cusbooneysii faahfaahinta jaamacadda ama dukumeentiga kadibna dib u gudbi. |
| `profile.statusGuidance.REJECTED` | Your verification was rejected. Contact FursadHub before submitting again. | Xaqiijintaadii waa la diiday. La xiriir FursadHub ka hor inta aadan dib u gudbin. |
| `profile.statusGuidance.SUSPENDED` | Your verification is suspended. Contact FursadHub to resolve it. | Xaqiijintaadu waa hakad. La xiriir FursadHub si loo xalliyo. |
| `profile.statusGuidance.REVOKED` | Your verification has been revoked. Contact FursadHub to resolve it. | Xaqiijintaadii waa la burburiyay. La xiriir FursadHub si loo xalliyo. |
| `profile.goToVerification` | Go to university profile | U gudub bogga jaamacadda |
| `departments.renameNamed` | Rename {{name}} | Magaca beddel: {{name}} |
| `verificationQueue.filterLabel` | Show cases | Muuji kiisaska |
| `verificationQueue.needsReview` | Needs review | U baahan dib-u-eegis |
| `verificationQueue.clearTitle` | Nothing to review | Wax dib-u-eegis u baahan ma jiro |
| `verificationQueue.clearBody` | Every submitted enrollment has been reviewed. New submissions appear here. | Diiwaangelin kasta oo la soo gudbiyay waa la eegay. Kuwa cusub halkan ayay ka muuqan doonaan. |
| `verificationQueue.resultCount_one` | {{count}} case | {{count}} kiis |
| `verificationQueue.resultCount_other` | {{count}} cases | {{count}} kiis |
| `verificationQueue.escalated` | Escalated to FursadHub | Loo gudbiyay FursadHub |
| `caseDetail.statusTitle` | Case status | Xaaladda kiiska |
| `caseDetail.statusLabel` | Status | Xaaladda |
| `caseDetail.reviewedAt` | Last reviewed | Markii ugu dambeysay ee la eegay |
| `caseDetail.lastNote` | Latest review note | Qoraalkii ugu dambeeyay ee dib-u-eegista |
| `caseDetail.decisionHint` | Check the claim against your university records and the evidence before deciding. | Ka hor intaadan go’aan gaarin, sheegashada iyo caddaynta la barbardhig diiwaannada jaamacaddaada. |
| `caseDetail.codeLabel` | Student’s six-digit code | Koodhka lix-god ah ee ardayga |
| `caseDetail.revokeHint` | Revoking removes this student’s verified enrollment. They will no longer be able to apply or be nominated. | Ka-noqoshadu waxay meesha ka saaraysaa diiwaangelinta la xaqiijiyay ee ardaygan. Mar dambe ma codsan karo, lamana magacaabi karo. |
| `caseDetail.confirmReject.title` | Reject this enrollment? | Ma diidaysaa diiwaangelintan? |
| `caseDetail.confirmReject.body` | The student will be told their enrollment was not verified, with your note. The case cannot be reopened. | Ardayga waxaa loo sheegi doonaa in diiwaangelintiisa aan la xaqiijin, iyadoo la raacinayo qoraalkaaga. Kiiska dib looma furi karo. |
| `caseDetail.confirmRevoke.title` | Revoke this verification? | Ma ka noqonaysaa xaqiijintan? |
| `caseDetail.confirmRevoke.body` | The student’s enrollment will no longer count as verified. This cannot be undone. | Diiwaangelinta ardayga looma tirin doono mid la xaqiijiyay. Tan dib looma celin karo. |
| `caseDetail.confirmKeep` | Go back | Dib u noqo |
| `verificationGate.statusGuidance.DRAFT` | Attach your registration or accreditation document on the university profile and submit it for verification. | Ku lifaaq dukumeentiga diiwaangelinta ama aqoonsiga profile-ka jaamacadda kadibna u gudbi xaqiijinta. |
| `verificationGate.statusGuidance.SUBMITTED` | Your submission is with FursadHub. You will be notified when the review is complete. | Codsigaagu wuxuu la joogaa FursadHub. Waa lagu wargelin doonaa marka dib-u-eegistu dhammaato. |
| `verificationGate.statusGuidance.UNDER_REVIEW` | FursadHub is reviewing your submission. You will be notified when it is complete. | FursadHub wuxuu dib u eegayaa codsigaaga. Waa lagu wargelin doonaa marka la dhammeeyo. |
| `verificationGate.statusGuidance.NEEDS_CHANGES` | FursadHub has asked for changes. Update your university profile and submit again. | FursadHub wuxuu codsaday isbeddello. Cusbooneysii profile-ka jaamacadda kadibna dib u gudbi. |
| `verificationGate.statusGuidance.REJECTED` | Your verification was rejected. Contact FursadHub before submitting again. | Xaqiijintaadii waa la diiday. La xiriir FursadHub ka hor inta aadan dib u gudbin. |
| `verificationGate.statusGuidance.SUSPENDED` | Your verification is suspended. Contact FursadHub to resolve it. | Xaqiijintaadu waa hakad. La xiriir FursadHub si loo xalliyo. |
| `verificationGate.statusGuidance.REVOKED` | Your verification has been revoked. Contact FursadHub to resolve it. | Xaqiijintaadii waa la burburiyay. La xiriir FursadHub si loo xalliyo. |
| `workspace.unknownStudent` | Unnamed student | Arday aan magac lahayn |
| `workspace.unknownDepartment` | Department | Waax |
| `workspace.admin.subtitle` | Your university’s students, internships and the work waiting on you. | Ardayda jaamacaddaada, tababarrada iyo shaqada adiga ku sugaysa. |
| `workspace.coordinator.title` | Department coordination | Isku-duwidda waaxda |
| `workspace.coordinator.subtitle` | Nominations, verification and internships for your departments. | Magacaabista, xaqiijinta iyo tababarrada waaxyahaaga. |
| `workspace.coordinator.scope` | Your departments: {{departments}} | Waaxyahaaga: {{departments}} |
| `workspace.coordinator.noScopeTitle` | No department assigned yet | Weli waax laguuma xilsaarin |
| `workspace.coordinator.noScopeBody` | Coordinator work is limited to the departments you are assigned. Ask your university admin to assign you a department. | Shaqada isku-duwaha waxay ku eg tahay waaxyaha laguu xilsaaray. Weydii maamulaha jaamacadda inuu waax kuu xilsaaro. |
| `workspace.coordinator.internsTitle` | Your departments’ internships | Tababarrada waaxyahaaga |
| `workspace.coordinator.internsEmpty` | No students from your departments are on an internship right now. | Hadda arday ka mid ah waaxyahaaga oo tababar ku jira ma jiro. |
| `workspace.supervisor.internsDescription` | The students you are assigned to supervise, and what is waiting on you for each. | Ardayda laguu xilsaaray inaad kormeerto, iyo waxa adiga kugu sugaya mid kasta. |
| `workspace.attention.title` | Needs your attention | U baahan feejignaantaada |
| `workspace.attention.clearTitle` | You’re all caught up | Wax kaa dhiman ma jiraan |
| `workspace.attention.clearBody` | Verification cases, nomination requests and internships that need the university will appear here. | Kiisaska xaqiijinta, codsiyada magacaabista iyo tababarrada u baahan jaamacadda halkan ayay ka muuqan doonaan. |
| `workspace.attention.coordinatorClearBody` | Students to verify, requests to nominate for and internships to complete in your departments will appear here. | Ardayda la xaqiijinayo, codsiyada la magacaabayo iyo tababarrada la dhammaystirayo ee waaxyahaaga halkan ayay ka muuqan doonaan. |
| `workspace.attention.supervisorClearBody` | Weekly logs and final reports your students submit for review will appear here. | Warbixinnada toddobaadlaha ah iyo warbixinnada kama dambaysta ah ee ardaydaadu u soo gudbiyaan dib-u-eegis halkan ayay ka muuqan doonaan. |
| `workspace.attention.partial` | Some of your work could not be loaded, so this list may be incomplete. | Qayb ka mid ah shaqadaada lama soo qaadi karin, sidaas darteed liiskani waxaa laga yaabaa inuu dhiman yahay. |
| `workspace.attention.items.casesToReview.title_one` | {{count}} student enrollment to verify | {{count}} diiwaangelin arday oo la xaqiijinayo |
| `workspace.attention.items.casesToReview.title_other` | {{count}} student enrollments to verify | {{count}} diiwaangelin arday oo la xaqiijinayo |
| `workspace.attention.items.casesToReview.action` | Review | Eeg |
| `workspace.attention.items.requestsOpen.title_one` | {{count}} internship is waiting for nominees | {{count}} tababar ayaa sugaya musharrixiin la magacaabo |
| `workspace.attention.items.requestsOpen.title_other` | {{count}} internships are waiting for nominees | {{count}} tababar ayaa sugaya musharrixiin la magacaabo |
| `workspace.attention.items.requestsOpen.action` | Nominate | Magacaab |
| `workspace.attention.items.nominationsAwaitingStudent.title_one` | {{count}} nomination is waiting for the student’s answer | {{count}} magacaabis ayaa sugaysa jawaabta ardayga |
| `workspace.attention.items.nominationsAwaitingStudent.title_other` | {{count}} nominations are waiting for students’ answers | {{count}} magacaabis ayaa sugaya jawaabaha ardayda |
| `workspace.attention.items.nominationsAwaitingStudent.action` | View | Eeg |
| `workspace.attention.items.placementsAwaitingCompletion.title_one` | {{count}} internship is ready for your completion decision | {{count}} tababar ayaa diyaar u ah go’aankaaga dhammaystirka |
| `workspace.attention.items.placementsAwaitingCompletion.title_other` | {{count}} internships are ready for your completion decision | {{count}} tababar ayaa diyaar u ah go’aankaaga dhammaystirka |
| `workspace.attention.items.placementsAwaitingCompletion.action` | Decide | Go’aami |
| `workspace.attention.items.placementsWithoutSupervisor.title_one` | {{count}} internship has no academic supervisor | {{count}} tababar ma laha kormeere tacliimeed |
| `workspace.attention.items.placementsWithoutSupervisor.title_other` | {{count}} internships have no academic supervisor | {{count}} tababar ma laha kormeere tacliimeed |
| `workspace.attention.items.placementsWithoutSupervisor.action` | Assign | Xilsaar |
| `workspace.attention.items.logsToReview.title_one` | {{count}} weekly log to review | {{count}} warbixin toddobaadle ah oo la eegayo |
| `workspace.attention.items.logsToReview.title_other` | {{count}} weekly logs to review | {{count}} warbixin toddobaadle ah oo la eegayo |
| `workspace.attention.items.logsToReview.action` | Review | Eeg |
| `workspace.attention.items.reportsToReview.title_one` | {{count}} final report to review | {{count}} warbixin kama dambays ah oo la eegayo |
| `workspace.attention.items.reportsToReview.title_other` | {{count}} final reports to review | {{count}} warbixin kama dambays ah oo la eegayo |
| `workspace.attention.items.reportsToReview.action` | Review | Eeg |
| `workspace.metrics.title` | At a glance | Jaleecada koowaad |
| `workspace.metrics.verifiedStudents` | Verified students | Ardayda la xaqiijiyay |
| `workspace.metrics.ofStudents_one` | of {{count}} student | ka mid ah {{count}} arday |
| `workspace.metrics.ofStudents_other` | of {{count}} students | ka mid ah {{count}} arday |
| `workspace.metrics.casesToReview` | Enrollments to verify | Diiwaangelinta la xaqiijinayo |
| `workspace.metrics.openRequests` | Requests needing nominees | Codsiyada u baahan musharrixiin |
| `workspace.metrics.currentInterns` | Students on internship | Ardayda tababarka ku jira |
| `workspace.metrics.departmentStudents` | Students in your departments | Ardayda waaxyahaaga |
| `workspace.cases.title` | Enrollments to verify | Diiwaangelinta la xaqiijinayo |
| `workspace.cases.description` | Oldest submission first. | Kuwa ugu horreeyay ee la soo gudbiyay marka hore. |
| `workspace.cases.empty` | No enrollment is waiting for review. | Diiwaangelin sugaysa dib-u-eegis ma jirto. |
| `workspace.cases.more_one` | {{count}} more waiting | {{count}} kale ayaa sugaya |
| `workspace.cases.more_other` | {{count}} more waiting | {{count}} kale ayaa sugaya |
| `workspace.requests.title` | Requests needing nominees | Codsiyada u baahan musharrixiin |
| `workspace.requests.description` | Nearest nomination deadline first. | Waqtiga magacaabista ee ugu dhow marka hore. |
| `workspace.requests.empty` | No internship is waiting for nominees from your university right now. | Hadda tababar sugaya musharrixiin jaamacaddaada ka yimaada ma jiro. |
| `workspace.interns.readyToComplete` | Ready for your completion decision | Diyaar u ah go’aankaaga dhammaystirka |
| `workspace.interns.noSupervisor` | No academic supervisor yet | Weli ma laha kormeere tacliimeed |
| `workspace.interns.logsWaiting_one` | {{count}} log to review | {{count}} warbixin oo la eegayo |
| `workspace.interns.logsWaiting_other` | {{count}} logs to review | {{count}} warbixin oo la eegayo |
| `workspace.interns.reportWaiting` | Final report to review | Warbixinta kama dambaysta ah oo la eegayo |
| `workspace.lifecycle.title` | Internship progress | Horumarka tababarka |
| `workspace.lifecycle.completionPending` | Waiting for the university’s completion decision | Waxay sugaysaa go’aanka dhammaystirka ee jaamacadda |
| `workspace.lifecycle.evaluation.MISSING` | Not started by the host organization | Hay’adda martigelisay weli ma bilaabin |
| `workspace.lifecycle.evaluation.DRAFT` | Being written by the host organization | Hay’adda martigelisay ayaa qoraysa |
| `workspace.lifecycle.evaluation.SUBMITTED` | Submitted by the host organization, not final | Hay’adda martigelisay ayaa gudbisay, weli ma aha kama dambays |
| `workspace.lifecycle.evaluation.FINAL` | Final | Kama dambays |
| `workspace.placement.clearBody` | Weekly logs, the final report and the defense will appear here when they need the university. | Warbixinnada toddobaadlaha ah, warbixinta kama dambaysta ah iyo difaaca halkan ayay ka muuqan doonaan marka ay u baahdaan jaamacadda. |
| `workspace.placement.attention.logs_one` | {{count}} weekly log waiting for review | {{count}} warbixin toddobaadle ah ayaa sugaysa dib-u-eegis |
| `workspace.placement.attention.logs_other` | {{count}} weekly logs waiting for review | {{count}} warbixin toddobaadle ah ayaa sugaya dib-u-eegis |
| `workspace.placement.attention.report` | Final report waiting for review | Warbixinta kama dambaysta ah ayaa sugaysa dib-u-eegis |
| `workspace.placement.attention.review` | Review | Eeg |
| `workspace.placement.attention.defenseScheduled` | Defense scheduled | Difaaca waa la qorsheeyay |
| `workspace.placement.attention.defenseToSchedule` | Defense not scheduled yet | Difaaca weli lama qorsheyn |
| `workspace.placement.attention.schedule` | Schedule | Qorshee |
| `workspace.placement.attention.open` | Open | Fur |
| `workspace.placement.attention.disputes_one` | {{count}} disputed attendance record — the host organization’s supervisor resolves it | {{count}} diiwaan xaadiris oo lagu murmay — kormeeraha hay’adda martigelisay ayaa xalliya |
| `workspace.placement.attention.disputes_other` | {{count}} disputed attendance records — the host organization’s supervisor resolves them | {{count}} diiwaan xaadiris oo lagu murmay — kormeeraha hay’adda martigelisay ayaa xalliya |
| `workspace.placement.attention.completion` | Ready for your completion decision | Diyaar u ah go’aankaaga dhammaystirka |
| `workspace.placement.attention.decide` | Decide | Go’aami |
| `workspace.placement.attention.noSupervisor` | No academic supervisor assigned | Kormeere tacliimeed lama xilsaarin |
| `workspace.placement.attention.assign` | Assign | Xilsaar |

