const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');

const rawQuestionsAndKeys = [
  // Section A — General Public-Service Knowledge (1–10)
  {
    num: 1,
    section: "Section A — General Public-Service Knowledge",
    text: "A public employee discovers that a senior official has instructed the employee to bypass a mandatory control to accelerate a service. What is the most appropriate response?",
    options: [
      "Follow the instruction because seniority overrides normal procedures.",
      "Refuse all future instructions from the official.",
      "Explain the control requirement, document the instruction appropriately, and use authorized escalation procedures if necessary.",
      "Complete the transaction and report it only if an audit discovers the issue."
    ],
    ans: "C",
    exp: "Follow lawful procedures, document concerns, and escalate appropriately."
  },
  {
    num: 2,
    section: "Section A — General Public-Service Knowledge",
    text: "Which principle most directly requires public employees to apply the same eligibility criteria to applicants in equivalent circumstances?",
    options: [
      "Administrative discretion",
      "Impartiality and equal treatment",
      "Organizational hierarchy",
      "Confidentiality"
    ],
    ans: "B",
    exp: "Impartiality requires consistent treatment of comparable cases."
  },
  {
    num: 3,
    section: "Section A — General Public-Service Knowledge",
    text: "An employee responsible for evaluating bids discovers that one bidder is a close relative. What is the best action?",
    options: [
      "Continue the evaluation but avoid communicating with the relative.",
      "Give the relative the same score as every other bidder.",
      "Declare the conflict of interest and follow the applicable recusal and replacement procedures.",
      "Exclude the bidder automatically without notifying the procurement authority."
    ],
    ans: "C",
    exp: "Disclosure and appropriate recusal protect procurement integrity."
  },
  {
    num: 4,
    section: "Section A — General Public-Service Knowledge",
    text: "A public institution publishes a performance report that omits known service failures to make its results appear better. Which principle is most directly violated?",
    options: [
      "Accountability and truthful reporting",
      "Delegation of authority",
      "Operational flexibility",
      "Informal communication"
    ],
    ans: "A",
    exp: "Omitting known failures undermines accountability and truthful reporting."
  },
  {
    num: 5,
    section: "Section A — General Public-Service Knowledge",
    text: "Which situation best illustrates the difference between efficiency and effectiveness?",
    options: [
      "Efficiency measures whether objectives are achieved; effectiveness measures the resources consumed.",
      "Efficiency and effectiveness always mean the same thing.",
      "Efficiency concerns resource use, while effectiveness concerns achievement of intended objectives.",
      "Effectiveness is measured only by employee attendance."
    ],
    ans: "C",
    exp: "Efficiency concerns resource use; effectiveness concerns objective achievement."
  },
  {
    num: 6,
    section: "Section A — General Public-Service Knowledge",
    text: "A public officer receives a gift from a supplier while evaluating that supplier's contract. What should the officer do first?",
    options: [
      "Accept the gift if its monetary value is small.",
      "Follow the institution's gift and conflict-of-interest rules, disclose the offer, and seek authorized guidance.",
      "Accept the gift but record it privately.",
      "Transfer the gift to a colleague without disclosure."
    ],
    ans: "B",
    exp: "Gifts must be handled under applicable disclosure and conflict rules."
  },
  {
    num: 7,
    section: "Section A — General Public-Service Knowledge",
    text: "Which is the strongest evidence that an administrative decision is accountable?",
    options: [
      "The decision was made by the most senior employee.",
      "The decision was implemented quickly.",
      "The affected employee verbally accepted the decision.",
      "The decision has a documented rationale, authorized approval, supporting evidence, and an identifiable responsible officer."
    ],
    ans: "D",
    exp: "Documented rationale, evidence, approval, and responsibility support accountability."
  },
  {
    num: 8,
    section: "Section A — General Public-Service Knowledge",
    text: "An employee receives a request for confidential personal information from someone claiming to be a senior official. What is the best response?",
    options: [
      "Verify the requester's identity, authority, purpose, and applicable disclosure rules before releasing information.",
      "Release the information because the requester claims seniority.",
      "Send the information through a personal messaging account.",
      "Refuse every request for personal information, including legally authorized requests."
    ],
    ans: "A",
    exp: "Identity, authority, purpose, and disclosure rules must be verified."
  },
  {
    num: 9,
    section: "Section A — General Public-Service Knowledge",
    text: "Which action best supports segregation of duties in public financial administration?",
    options: [
      "Allowing one employee to order goods, approve payment, receive the goods, and reconcile the account.",
      "Giving the same person unrestricted access to every financial control.",
      "Separating authorization, custody, transaction processing, and independent reconciliation where practicable.",
      "Removing all approval requirements for low-value transactions."
    ],
    ans: "C",
    exp: "Segregation of duties establishes independent controls."
  },
  {
    num: 10,
    section: "Section A — General Public-Service Knowledge",
    text: "A performance indicator improves significantly, but citizens report that service quality has deteriorated. What is the most defensible conclusion?",
    options: [
      "The indicator must be correct because it is numerical.",
      "The indicator may not capture the full outcome and should be reviewed alongside service-quality evidence.",
      "Citizen feedback should be ignored if targets are met.",
      "The institution should immediately discontinue all performance measurement."
    ],
    ans: "B",
    exp: "An indicator may not adequately represent actual service outcomes."
  },

  // Section B — IT and ICT Technical Competencies (11–25)
  {
    num: 11,
    section: "Section B — IT and ICT Technical Competencies",
    text: "A workstation receives an IP address of 169.254.24.10/16, has no default gateway, and cannot access the network. What is the most likely initial diagnosis?",
    options: [
      "DNS has resolved the gateway incorrectly.",
      "DHCP address assignment has failed, causing an APIPA address to be assigned.",
      "The workstation has received a valid public IP address.",
      "The switch has automatically enabled inter-VLAN routing."
    ],
    ans: "B",
    exp: "An APIPA address commonly indicates unsuccessful DHCP assignment."
  },
  {
    num: 12,
    section: "Section B — IT and ICT Technical Competencies",
    text: "Users in VLAN 10 can communicate locally but cannot reach VLAN 20. Both VLANs are active, and their access ports are correctly assigned. Which configuration is most directly required for inter-VLAN communication?",
    options: [
      "A higher DHCP lease duration",
      "A different DNS search suffix",
      "A second MAC address on every workstation",
      "A functioning Layer 3 routing configuration with appropriate VLAN interfaces, addressing, and routes"
    ],
    ans: "D",
    exp: "Inter-VLAN traffic requires appropriate Layer 3 routing."
  },
  {
    num: 13,
    section: "Section B — IT and ICT Technical Competencies",
    text: "A computer can access websites by IP address but cannot resolve domain names. Which diagnostic step is most appropriate first?",
    options: [
      "Inspect DNS configuration and test name resolution using tools such as nslookup.",
      "Replace the network interface card immediately.",
      "Reinstall the operating system before checking connectivity.",
      "Change the computer's MAC address."
    ],
    ans: "A",
    exp: "IP connectivity with failed name resolution suggests a DNS problem."
  },
  {
    num: 14,
    section: "Section B — IT and ICT Technical Competencies",
    text: "A Windows workstation has internet access but cannot open a mapped network drive. Other users can access the same share. Which investigation is most appropriate?",
    options: [
      "Replace the institution's internet router immediately.",
      "Disable endpoint protection permanently.",
      "Check VPN or LAN reachability, name resolution, credentials, share permissions, and the SMB connection.",
      "Change the public DNS server without testing the file server."
    ],
    ans: "C",
    exp: "Investigate SMB connectivity, permissions, credentials, and network reachability."
  },
  {
    num: 15,
    section: "Section B — IT and ICT Technical Competencies",
    text: "A server's CPU utilization remains near 100%, and users report intermittent timeouts. What should an administrator do first?",
    options: [
      "Increase CPU allocation without identifying the cause.",
      "Examine process-level utilization, system logs, workload patterns, and resource bottlenecks before selecting a remedy.",
      "Delete application logs to free CPU capacity.",
      "Disable authentication to reduce processing overhead."
    ],
    ans: "B",
    exp: "Identify the process and resource bottleneck before remediation."
  },
  {
    num: 16,
    section: "Section B — IT and ICT Technical Competencies",
    text: "A Windows computer repeatedly crashes with a blue screen after a driver update. Which action provides the strongest initial evidence for root-cause analysis?",
    options: [
      "Repeatedly restart the computer until it stabilizes.",
      "Format the drive without collecting evidence.",
      "Disable all security controls permanently.",
      "Examine stop codes, crash dumps, event logs, and the recent driver change; test rollback where appropriate."
    ],
    ans: "D",
    exp: "Crash dumps, stop codes, logs, and recent changes provide diagnostic evidence."
  },
  {
    num: 17,
    section: "Section B — IT and ICT Technical Competencies",
    text: "What is the principal difference between sfc /scannow and DISM /Online /Cleanup-Image /RestoreHealth in Windows?",
    options: [
      "SFC checks and repairs protected system files; DISM can repair the Windows component store used for servicing.",
      "SFC configures DNS, while DISM configures DHCP.",
      "SFC repairs physical RAM, while DISM repairs hard-drive sectors.",
      "Both commands only clear temporary files."
    ],
    ans: "A",
    exp: "SFC repairs protected system files; DISM can repair the component store."
  },
  {
    num: 18,
    section: "Section B — IT and ICT Technical Competencies",
    text: "A user receives a duplicate-IP-address warning. What should the technician investigate?",
    options: [
      "Only the browser cache",
      "The monitor refresh rate",
      "DHCP leases, static IP assignments, reservations, and conflicting devices",
      "The keyboard layout"
    ],
    ans: "C",
    exp: "Conflicting DHCP leases and static assignments can cause duplicate IPs."
  },
  {
    num: 19,
    section: "Section B — IT and ICT Technical Competencies",
    text: "A workstation cannot join an Active Directory domain even though the domain controller is reachable by IP address. Which condition is particularly important to verify?",
    options: [
      "Whether the workstation has the same wallpaper as the domain controller",
      "DNS configuration, domain-controller discovery, time synchronization, credentials, and domain-join permissions",
      "Whether the user has installed a PDF reader",
      "Whether the workstation's display resolution matches the server"
    ],
    ans: "B",
    exp: "Domain joining depends on DNS, discovery, time, credentials, and permissions."
  },
  {
    num: 20,
    section: "Section B — IT and ICT Technical Competencies",
    text: "A database application is vulnerable to SQL injection because it concatenates user input directly into SQL statements. Which remediation is strongest?",
    options: [
      "Hide database error messages while leaving the queries unchanged.",
      "Block all punctuation in the user interface and assume the database is safe.",
      "Store the database password in the source code.",
      "Use parameterized queries or prepared statements, validate inputs, and enforce least-privilege database permissions."
    ],
    ans: "D",
    exp: "Parameterized queries are a primary defense against SQL injection."
  },
  {
    num: 21,
    section: "Section B — IT and ICT Technical Competencies",
    text: "A firewall permits inbound HTTPS traffic to a web server, but the service remains unreachable. Which investigation is most appropriate?",
    options: [
      "Verify DNS resolution, routing, firewall rules, listening sockets, service status, and host-level filtering.",
      "Assume the firewall is the only possible cause.",
      "Disable every firewall in the network.",
      "Replace all network cables without testing."
    ],
    ans: "A",
    exp: "Reachability depends on multiple network, host, and service layers."
  },
  {
    num: 22,
    section: "Section B — IT and ICT Technical Competencies",
    text: "An employee clicks a phishing link and enters institutional credentials. What should the security team prioritize?",
    options: [
      "Delete the email and take no further action.",
      "Wait for evidence of financial loss before acting.",
      "Initiate incident response, revoke or reset compromised credentials, invalidate active sessions where appropriate, and investigate possible access.",
      "Send the same credentials to the employee's manager for safekeeping."
    ],
    ans: "C",
    exp: "Contain the compromise, secure identities, and investigate access."
  },
  {
    num: 23,
    section: "Section B — IT and ICT Technical Competencies",
    text: "A backup job reports success, but the institution has never tested a restoration. Which statement is most accurate?",
    options: [
      "A successful backup log proves that every file can be recovered.",
      "Recoverability remains unverified until restoration tests demonstrate that data and services can be recovered within required objectives.",
      "Restoration testing is unnecessary when cloud storage is used.",
      "Backups eliminate the need for access controls."
    ],
    ans: "B",
    exp: "A backup is not proven recoverable until restoration is tested."
  },
  {
    num: 24,
    section: "Section B — IT and ICT Technical Competencies",
    text: "An organization requires high availability for a critical service and wants to reduce the risk of losing recent transactions after a server failure. Which design is most appropriate?",
    options: [
      "One server with a larger hard drive and no backups",
      "Multiple servers sharing a single unprotected power source",
      "One server with periodic manual copies and no recovery plan",
      "Redundant service components, appropriate replication, tested failover, and backups with defined recovery-point and recovery-time objectives"
    ],
    ans: "D",
    exp: "Redundancy, replication, failover, and tested backups support resilience."
  },
  {
    num: 25,
    section: "Section B — IT and ICT Technical Competencies",
    text: "A technician must investigate suspected unauthorized access to a public institution's server. Which practice best preserves the evidentiary value of the investigation?",
    options: [
      "Record actions and timestamps, preserve relevant logs, restrict access to evidence, maintain chain of custody, and follow authorized forensic procedures.",
      "Reinstall the server before documenting the incident.",
      "Edit suspicious log entries to remove irrelevant details.",
      "Share disk images through personal accounts without access restrictions."
    ],
    ans: "A",
    exp: "Evidence preservation and chain of custody support reliable investigation."
  },

  // Section C — Accounting and Finance (26–35)
  {
    num: 26,
    section: "Section C — Accounting and Finance",
    text: "A public institution purchases equipment for cash. Under accrual accounting, assuming the equipment meets the applicable capitalization criteria, what is the immediate accounting effect?",
    options: [
      "Debit cash and credit equipment.",
      "Debit equipment and credit cash.",
      "Debit revenue and credit accounts payable.",
      "Debit expenses and credit revenue in every case."
    ],
    ans: "B",
    exp: "Equipment is debited as an asset and cash is credited."
  },
  {
    num: 27,
    section: "Section C — Accounting and Finance",
    text: "An institution's bank statement shows a balance of ETB 420,000. There is an outstanding payment of ETB 35,000 and a deposit in transit of ETB 22,000. What is the adjusted bank balance before considering any other reconciling items?",
    options: [
      "ETB 443,000",
      "ETB 407,000",
      "ETB 363,000",
      "ETB 385,000"
    ],
    ans: "B",
    exp: "ETB 420,000 + 22,000 − 35,000 = ETB 407,000."
  },
  {
    num: 28,
    section: "Section C — Accounting and Finance",
    text: "A department has an approved budget of ETB 2,000,000 and has committed ETB 1,450,000. It has paid ETB 1,100,000. Assuming all commitments are valid and amounts are measured consistently, what is the uncommitted budget balance?",
    options: [
      "ETB 900,000",
      "ETB 550,000",
      "ETB 350,000",
      "ETB 1,450,000"
    ],
    ans: "B",
    exp: "ETB 2,000,000 − ETB 1,450,000 = ETB 550,000 uncommitted."
  },
  {
    num: 29,
    section: "Section C — Accounting and Finance",
    text: "An employee preparing payments also controls supplier creation and performs bank reconciliation. What is the principal internal-control weakness?",
    options: [
      "Excessive use of accrual accounting",
      "Insufficient budget allocation",
      "Too many independent approvals",
      "Inadequate segregation of duties, increasing the risk of unauthorized payments and concealment"
    ],
    ans: "D",
    exp: "Concentrating incompatible duties increases fraud and concealment risk."
  },
  {
    num: 30,
    section: "Section C — Accounting and Finance",
    text: "A supplier invoice is recorded twice, but only one payment has been made. Which correction is most appropriate?",
    options: [
      "Record a second payment to make the ledger agree with the duplicate invoice.",
      "Remove or reverse the duplicate liability entry using an authorized, documented correction.",
      "Increase revenue by the amount of the duplicate invoice.",
      "Ignore the duplicate because cash has not yet been paid twice."
    ],
    ans: "B",
    exp: "Reverse the duplicate liability through a documented correction."
  },
  {
    num: 31,
    section: "Section C — Accounting and Finance",
    text: "Which evidence provides the strongest support for a legitimate public expenditure?",
    options: [
      "A verbal assurance from the requesting employee",
      "An invoice without evidence of delivery or approval",
      "An authorized commitment, supporting procurement documents, verified receipt, valid invoice, and required payment approvals",
      "A bank transfer record alone, regardless of purpose"
    ],
    ans: "C",
    exp: "A complete audit trail supports authorization, receipt, and payment."
  },
  {
    num: 32,
    section: "Section C — Accounting and Finance",
    text: "Under the accrual basis, a service has been received before year-end, but the supplier invoice has not arrived. If the obligation can be reasonably estimated and recognition criteria are met, what is the appropriate treatment?",
    options: [
      "Recognize the expense and corresponding accrued liability.",
      "Recognize the expense only when cash is paid.",
      "Record revenue instead of an expense.",
      "Omit the transaction until the next fiscal year."
    ],
    ans: "A",
    exp: "Accrual accounting recognizes qualifying expenses and liabilities when incurred."
  },
  {
    num: 33,
    section: "Section C — Accounting and Finance",
    text: "A unit's expenditure is ETB 720,000 against a budget of ETB 800,000. What is the budget utilization rate?",
    options: [
      "80%",
      "85%",
      "95%",
      "90%"
    ],
    ans: "D",
    exp: "ETB 720,000 ÷ ETB 800,000 × 100 = 90%."
  },
  {
    num: 34,
    section: "Section C — Accounting and Finance",
    text: "An auditor finds that payments were made against purchase orders without evidence that goods were received. Which audit assertion or control concern is most directly implicated?",
    options: [
      "Presentation of employee leave balances",
      "Existence and validity of the expenditure, including evidence of receipt",
      "Accuracy of the institution's website content",
      "Completeness of unrelated training records"
    ],
    ans: "B",
    exp: "Receipt evidence supports the validity and existence of expenditure."
  },
  {
    num: 35,
    section: "Section C — Accounting and Finance",
    text: "A finance officer is asked to move an expense into the next reporting period to make the current period appear under budget. What is the correct response?",
    options: [
      "Make the change if the department head approves verbally.",
      "Delay all expense recording until the annual audit.",
      "Apply the appropriate recognition rules, retain supporting documentation, and report improper pressure through authorized channels.",
      "Change the transaction date without disclosing the change."
    ],
    ans: "C",
    exp: "Transactions must be recognized in the appropriate reporting period."
  },

  // Section D — Procurement and Purchasing (36–45)
  {
    num: 36,
    section: "Section D — Procurement and Purchasing",
    text: "A procurement unit repeatedly buys the same supplies through emergency procedures because departments submit requests late. What is the strongest corrective action?",
    options: [
      "Improve demand forecasting, consolidate predictable requirements where lawful, establish procurement plans, and monitor requisition lead times.",
      "Make all future purchases without competition.",
      "Increase emergency procurement use permanently.",
      "Stop documenting purchases to reduce processing time."
    ],
    ans: "A",
    exp: "Procurement planning reduces avoidable emergency purchases."
  },
  {
    num: 37,
    section: "Section D — Procurement and Purchasing",
    text: "A technical specification names a particular brand without a documented, lawful justification. What is the primary procurement concern?",
    options: [
      "The specification guarantees the lowest price.",
      "The specification automatically improves competition.",
      "The specification eliminates the need for evaluation criteria.",
      "The specification may unnecessarily restrict competition and undermine fair treatment."
    ],
    ans: "D",
    exp: "Unjustified brand restrictions can impair fair competition."
  },
  {
    num: 38,
    section: "Section D — Procurement and Purchasing",
    text: "A bidder submits the lowest price, but the bid fails a mandatory technical requirement established in the solicitation. What is the appropriate general approach?",
    options: [
      "Award the contract automatically because price is decisive.",
      "Evaluate the bid against the disclosed criteria and applicable rules; do not overlook a material noncompliance without lawful grounds.",
      "Invent a new technical criterion after opening bids.",
      "Ask the bidder to replace its bid secretly after evaluation."
    ],
    ans: "B",
    exp: "Bids must be assessed against disclosed criteria and applicable rules."
  },
  {
    num: 39,
    section: "Section D — Procurement and Purchasing",
    text: "During evaluation, a committee member privately gives one bidder information that has not been made available to competitors. Which principle is most directly compromised?",
    options: [
      "Inventory rotation",
      "Depreciation",
      "Equal treatment, transparency, and procurement integrity",
      "Payroll reconciliation"
    ],
    ans: "C",
    exp: "Unequal disclosure compromises transparency and fair treatment."
  },
  {
    num: 40,
    section: "Section D — Procurement and Purchasing",
    text: "A public institution receives three quotations, but evidence suggests that the suppliers coordinated their prices. What should the procurement team do?",
    options: [
      "Document indicators, preserve the records, and refer the concern through authorized procurement or competition-integrity procedures.",
      "Award to the middle-priced supplier without investigation.",
      "Destroy the quotations to avoid delay.",
      "Divide the purchase among all three suppliers automatically."
    ],
    ans: "A",
    exp: "Suspected collusion requires documented evidence and authorized escalation."
  },
  {
    num: 41,
    section: "Section D — Procurement and Purchasing",
    text: "A contract contains vague deliverables and no measurable acceptance criteria. What is the most important improvement before future procurement?",
    options: [
      "Remove performance reporting from the contract.",
      "Allow the supplier to define success after delivery.",
      "Evaluate performance only by the supplier's reputation.",
      "Specify measurable deliverables, quality standards, milestones, acceptance tests, and remedies consistent with the procurement rules."
    ],
    ans: "D",
    exp: "Measurable specifications and acceptance criteria make performance enforceable."
  },
  {
    num: 42,
    section: "Section D — Procurement and Purchasing",
    text: "A supplier requests payment for goods that have not been delivered. The requesting department insists that the supplier is trustworthy. What should the responsible officer do?",
    options: [
      "Pay immediately to preserve the relationship.",
      "Follow the contract and payment controls, verify the applicable conditions for payment, and obtain evidence required for authorization.",
      "Replace the receiving report with a verbal confirmation.",
      "Approve payment and investigate after the audit."
    ],
    ans: "B",
    exp: "Payment must satisfy contract terms and applicable verification controls."
  },
  {
    num: 43,
    section: "Section D — Procurement and Purchasing",
    text: "What is the main purpose of separating procurement requisition, bid evaluation, contract approval, receipt, and payment functions?",
    options: [
      "To eliminate all management accountability",
      "To guarantee that the cheapest bid wins",
      "To reduce conflicts of interest, prevent fraud, and create independent checks",
      "To increase the number of suppliers on every contract"
    ],
    ans: "C",
    exp: "Independent functions reduce conflicts, fraud, and unauthorized transactions."
  },
  {
    num: 44,
    section: "Section D — Procurement and Purchasing",
    text: "A contract variation substantially increases the scope and cost of a public works contract. What should be assessed first?",
    options: [
      "Whether the change is contractually and legally permissible, justified, properly approved, funded, and consistent with applicable procurement requirements",
      "Whether the supplier agrees to the increase",
      "Whether the project manager can approve it without limits",
      "Whether the variation can be excluded from contract records"
    ],
    ans: "A",
    exp: "Variations require proper justification, authority, funding, and compliance."
  },
  {
    num: 45,
    section: "Section D — Procurement and Purchasing",
    text: "A procurement office wants to measure whether its process is improving. Which indicator is most informative when defined consistently?",
    options: [
      "Number of procurement staff who attended meetings",
      "Number of pages in the annual procurement report",
      "Number of suppliers whose names begin with the same letter",
      "Percentage of procurement actions completed within planned lead times while meeting compliance and quality requirements"
    ],
    ans: "D",
    exp: "Timeliness combined with compliance and quality provides a meaningful measure."
  },

  // Section E — Property Management, Stores and Logistics (46–55)
  {
    num: 46,
    section: "Section E — Property Management, Stores and Logistics",
    text: "A store ledger records 500 units, but a physical count finds 463. What is the most appropriate first response?",
    options: [
      "Change the ledger to 463 immediately without investigation.",
      "Verify the count and transaction records, investigate the 37-unit discrepancy, document the findings, and authorize any adjustment.",
      "Ignore the discrepancy because it is less than 10%.",
      "Purchase 37 units immediately and conceal the shortage."
    ],
    ans: "B",
    exp: "Verify and investigate the 37-unit shortage before adjusting records."
  },
  {
    num: 47,
    section: "Section E — Property Management, Stores and Logistics",
    text: "Under the first-in, first-out (FIFO) inventory method, which units are assumed to be issued first?",
    options: [
      "The newest units received",
      "The units with the highest purchase price",
      "The oldest units received",
      "The units with the longest warranty"
    ],
    ans: "C",
    exp: "FIFO assumes the oldest inventory is issued first."
  },
  {
    num: 48,
    section: "Section E — Property Management, Stores and Logistics",
    text: "An item has average daily demand of 20 units, supplier lead time of 6 days, and safety stock of 40 units. Using the formula reorder point = average daily demand × lead time + safety stock, what is the reorder point?",
    options: [
      "160 units",
      "120 units",
      "100 units",
      "240 units"
    ],
    ans: "A",
    exp: "Reorder point = 20 × 6 + 40 = 160 units."
  },
  {
    num: 49,
    section: "Section E — Property Management, Stores and Logistics",
    text: "A storekeeper receives goods with visible damage, although the delivery note lists the full quantity. What is the correct procedure?",
    options: [
      "Sign an unconditional acceptance and resolve the matter informally later.",
      "Record the goods as fully acceptable without inspection.",
      "Discard the damaged goods without informing anyone.",
      "Document the discrepancy, segregate or identify damaged items, notify the responsible parties, and process acceptance or claims under the contract and procedures."
    ],
    ans: "D",
    exp: "Damaged goods must be documented and assessed before disposition."
  },
  {
    num: 50,
    section: "Section E — Property Management, Stores and Logistics",
    text: "A department has unused equipment assigned to former employees, while another department is purchasing identical equipment. What is the best property-management response?",
    options: [
      "Approve the purchase because each department has its own budget.",
      "Verify ownership, condition, location, and transfer requirements, then assess reassignment before purchasing new assets.",
      "Remove the unused equipment from the asset register.",
      "Transfer the equipment without documentation."
    ],
    ans: "B",
    exp: "Reassignment can prevent unnecessary purchases and improve asset utilization."
  },
  {
    num: 51,
    section: "Section E — Property Management, Stores and Logistics",
    text: "Why are serial numbers, asset tags, location records, and assigned-custodian records important?",
    options: [
      "They eliminate the need for physical verification.",
      "They guarantee that assets never depreciate.",
      "They support identification, accountability, traceability, and physical verification of assets.",
      "They replace purchase documentation."
    ],
    ans: "C",
    exp: "Asset identifiers and custody records enable traceability and accountability."
  },
  {
    num: 52,
    section: "Section E — Property Management, Stores and Logistics",
    text: "Which method is most suitable for identifying inventory items that warrant the greatest management attention based on annual consumption value?",
    options: [
      "ABC analysis",
      "Random numbering",
      "Alphabetical filing alone",
      "FIFO alone"
    ],
    ans: "A",
    exp: "ABC analysis prioritizes items by annual consumption value."
  },
  {
    num: 53,
    section: "Section E — Property Management, Stores and Logistics",
    text: "A warehouse experiences repeated stockouts of critical items despite holding large quantities of slow-moving supplies. What is the best corrective approach?",
    options: [
      "Increase all inventory levels equally.",
      "Stop recording stock movements.",
      "Reorder only after every item reaches zero.",
      "Analyze demand, lead times, criticality, reorder points, safety stock, and item-specific consumption patterns."
    ],
    ans: "D",
    exp: "Demand, criticality, lead time, and reorder controls address stock imbalances."
  },
  {
    num: 54,
    section: "Section E — Property Management, Stores and Logistics",
    text: "Which document trail best supports the movement of an asset from one department to another?",
    options: [
      "A verbal agreement between the two custodians",
      "An authorized transfer document recording asset identification, sending and receiving units, condition, date, and updated custody records",
      "A new purchase order for the same asset",
      "An informal email with no identifying details or approval"
    ],
    ans: "B",
    exp: "An authorized transfer record establishes the movement and new custody."
  },
  {
    num: 55,
    section: "Section E — Property Management, Stores and Logistics",
    text: "A batch of temperature-sensitive supplies is delivered, but the temperature log shows an excursion beyond the permitted range. What should the receiving team do?",
    options: [
      "Issue the supplies immediately to avoid waste.",
      "Accept the supplies because the packaging is intact.",
      "Quarantine or segregate the affected batch pending documented assessment and disposition by authorized personnel.",
      "Erase the temperature log and request a new delivery note."
    ],
    ans: "C",
    exp: "A temperature excursion requires assessment before the batch is released."
  },

  // Section F — Human Resource Management (56–65)
  {
    num: 56,
    section: "Section F — Human Resource Management",
    text: "Two candidates meet the minimum qualifications for a public vacancy. One is personally recommended by a senior official. What should the selection panel do?",
    options: [
      "Apply the published criteria consistently, document evidence and scores, and manage conflicts of interest.",
      "Select the recommended candidate automatically.",
      "Replace the published criteria after interviews.",
      "Select the candidate who promises to stay longest, without evidence."
    ],
    ans: "A",
    exp: "Consistent published criteria support merit-based recruitment."
  },
  {
    num: 57,
    section: "Section F — Human Resource Management",
    text: "An employee's performance declines following a change in assigned duties. What is the most appropriate initial management response?",
    options: [
      "Issue the maximum disciplinary penalty immediately.",
      "Remove all duties permanently.",
      "Record the decline but never discuss it with the employee.",
      "Clarify expectations, gather evidence, discuss barriers and training needs, and establish a documented improvement plan where appropriate."
    ],
    ans: "D",
    exp: "Performance improvement begins with evidence, feedback, and clear expectations."
  },
  {
    num: 58,
    section: "Section F — Human Resource Management",
    text: "Which distinction between performance management and disciplinary action is most accurate?",
    options: [
      "They are identical processes in all circumstances.",
      "Performance management focuses on objectives, feedback, and development; disciplinary action addresses alleged misconduct under applicable procedures.",
      "Disciplinary action is required for every missed performance target.",
      "Performance management must never involve written records."
    ],
    ans: "B",
    exp: "Performance management and disciplinary procedures serve distinct purposes."
  },
  {
    num: 59,
    section: "Section F — Human Resource Management",
    text: "A manager receives an allegation of serious misconduct against an employee. Which approach best protects procedural fairness?",
    options: [
      "Publicly announce the employee's guilt before investigation.",
      "Dismiss the employee solely on anonymous hearsay.",
      "Follow authorized investigation and disciplinary procedures, protect relevant evidence, and give the employee the applicable opportunity to respond.",
      "Ignore the allegation because investigations are inconvenient."
    ],
    ans: "C",
    exp: "Fair procedures require appropriate investigation and an opportunity to respond."
  },
  {
    num: 60,
    section: "Section F — Human Resource Management",
    text: "An HR officer is asked to disclose an employee's medical documentation to a manager who has no demonstrated need for the details. What is the appropriate response?",
    options: [
      "Apply confidentiality and data-minimization rules, verify lawful authority and legitimate need, and disclose only what is permitted.",
      "Share the full file because the requester is a manager.",
      "Post the file in a shared department folder.",
      "Send the file to all supervisors to prevent duplication."
    ],
    ans: "A",
    exp: "Confidential information must be protected and disclosed only as permitted."
  },
  {
    num: 61,
    section: "Section F — Human Resource Management",
    text: "Which approach provides the strongest basis for determining training needs?",
    options: [
      "Training every employee in the same subject regardless of role",
      "Choosing courses based solely on popularity",
      "Repeating last year's training plan without evaluation",
      "Comparing required competencies with demonstrated performance, organizational priorities, and evidence of capability gaps"
    ],
    ans: "D",
    exp: "Training needs should reflect demonstrated competency gaps."
  },
  {
    num: 62,
    section: "Section F — Human Resource Management",
    text: "An employee is consistently absent, but the attendance system contains contradictory entries. What should HR do before reaching a conclusion?",
    options: [
      "Assume every absence was unauthorized.",
      "Verify source records, correct data errors through authorized procedures, and apply the attendance policy using substantiated evidence.",
      "Delete the attendance history.",
      "Reduce the employee's salary without review or authorization."
    ],
    ans: "B",
    exp: "Personnel decisions should rely on verified and corrected records."
  },
  {
    num: 63,
    section: "Section F — Human Resource Management",
    text: "Which is the strongest approach to workforce succession planning?",
    options: [
      "Promote employees solely on length of service.",
      "Identify successors only after a vacancy occurs.",
      "Identify critical roles, assess competency gaps, develop potential successors, and review readiness and continuity risks.",
      "Restrict development opportunities to one favored employee."
    ],
    ans: "C",
    exp: "Succession planning develops continuity for critical roles."
  },
  {
    num: 64,
    section: "Section F — Human Resource Management",
    text: "An institution wants to reduce staff turnover in a critical technical unit. Which analysis is most useful before selecting interventions?",
    options: [
      "Examine turnover patterns by role, tenure, supervisor, compensation, workload, development opportunities, and exit-feedback evidence.",
      "Assume every departure is caused by salary alone.",
      "Increase recruitment advertising without investigating the cause.",
      "Prohibit employees from discussing working conditions."
    ],
    ans: "A",
    exp: "Root-cause analysis identifies the factors associated with turnover."
  },
  {
    num: 65,
    section: "Section F — Human Resource Management",
    text: "An HR manager discovers that a recruitment panel member has a personal relationship with an applicant. What is the most appropriate action?",
    options: [
      "Ignore the relationship if the panel member is experienced.",
      "Allow the member to score the applicant secretly.",
      "Disqualify the applicant automatically in every case.",
      "Require disclosure and apply the institution's conflict-of-interest, recusal, and replacement procedures as appropriate."
    ],
    ans: "D",
    exp: "Disclosure and appropriate recusal protect recruitment integrity."
  },

  // Section G — Management and Administration (66–75)
  {
    num: 66,
    section: "Section G — Management and Administration",
    text: "A manager receives multiple urgent requests, but staff capacity is limited. Which method provides the most defensible basis for prioritization?",
    options: [
      "Process requests in the order of the requesters' seniority.",
      "Assess legal deadlines, service impact, risk, dependencies, urgency, and available resources against explicit priorities.",
      "Assign every request the highest priority.",
      "Choose the easiest tasks and postpone all difficult work indefinitely."
    ],
    ans: "B",
    exp: "Risk, impact, deadlines, and resources support rational prioritization."
  },
  {
    num: 67,
    section: "Section G — Management and Administration",
    text: "A project repeatedly misses deadlines despite employees working overtime. What should the manager investigate first?",
    options: [
      "Whether staff are sufficiently afraid of consequences",
      "Whether overtime should be doubled",
      "Work breakdown, estimates, dependencies, bottlenecks, scope changes, resource allocation, and decision delays",
      "Whether all reporting can be discontinued"
    ],
    ans: "C",
    exp: "Persistent delays require analysis of workflow and capacity constraints."
  },
  {
    num: 68,
    section: "Section G — Management and Administration",
    text: "Which delegation arrangement best preserves managerial accountability?",
    options: [
      "Define the task, expected results, authority limits, resources, reporting arrangements, and review points.",
      "Transfer responsibility verbally without defining the outcome.",
      "Delegate a task but withhold all necessary authority and resources.",
      "Assume delegation removes the manager's accountability for oversight."
    ],
    ans: "A",
    exp: "Effective delegation defines outcomes, authority, resources, and oversight."
  },
  {
    num: 69,
    section: "Section G — Management and Administration",
    text: "A policy change is introduced without consulting the teams responsible for implementation. Resistance and operational errors increase. What is the strongest corrective measure?",
    options: [
      "Punish all employees who ask questions.",
      "Reverse every policy change automatically.",
      "Hide the policy until implementation is complete.",
      "Engage affected stakeholders, explain the rationale, assess implementation impacts, provide training, and establish feedback and monitoring mechanisms."
    ],
    ans: "D",
    exp: "Stakeholder engagement and implementation support reduce change resistance."
  },
  {
    num: 70,
    section: "Section G — Management and Administration",
    text: "A manager's monthly report shows that all planned activities were completed, but the intended service outcome was not achieved. What is the best interpretation?",
    options: [
      "Activity completion proves that the project succeeded.",
      "Outputs were delivered, but the intended outcome was not achieved; assumptions, output quality, and causal links need review.",
      "Outcomes should not be measured if activities are complete.",
      "The report must be accepted without further analysis."
    ],
    ans: "B",
    exp: "Completing activities does not establish achievement of intended outcomes."
  },
  {
    num: 71,
    section: "Section G — Management and Administration",
    text: "Which approach is most effective for resolving a recurring interdepartmental conflict over responsibilities?",
    options: [
      "Allow each department to create contradictory procedures.",
      "Assign blame before establishing the facts.",
      "Clarify decision rights, process ownership, handoffs, escalation routes, and shared performance measures.",
      "Remove all written responsibilities."
    ],
    ans: "C",
    exp: "Clear decision rights and process ownership reduce recurring conflicts."
  },
  {
    num: 72,
    section: "Section G — Management and Administration",
    text: "A manager wants to determine whether a new administrative procedure actually reduces processing delays. What is the strongest evaluation design available under ordinary operational constraints?",
    options: [
      "Establish a baseline, define comparable measures, track implementation and results, and account for other changes that could explain the outcome.",
      "Ask the procedure's author whether it worked.",
      "Compare two unrelated months without examining workload differences.",
      "Count how many employees received the new procedure."
    ],
    ans: "A",
    exp: "Baselines, comparable measures, and confounding factors strengthen evaluation."
  },
  {
    num: 73,
    section: "Section G — Management and Administration",
    text: "A critical service depends on one employee who holds undocumented operational knowledge. What should management prioritize?",
    options: [
      "Restrict that employee from taking leave.",
      "Keep the process undocumented to protect the employee's role.",
      "Replace the employee without transferring knowledge.",
      "Document the process, cross-train staff, control access to essential information, and test continuity arrangements."
    ],
    ans: "D",
    exp: "Documentation and cross-training reduce dependence on one employee."
  },
  {
    num: 74,
    section: "Section G — Management and Administration",
    text: "An organization experiences repeated mistakes because staff use different versions of the same procedure. Which control is most effective?",
    options: [
      "Allow every team to maintain its own uncontrolled master copy.",
      "Implement controlled document versions, designated ownership, approval history, access to current procedures, and withdrawal of obsolete versions.",
      "Remove all procedure documents.",
      "Rely only on verbal announcements."
    ],
    ans: "B",
    exp: "Version control ensures employees use authorized, current procedures."
  },
  {
    num: 75,
    section: "Section G — Management and Administration",
    text: "Which response best reflects evidence-based administrative decision-making?",
    options: [
      "Choose the option preferred by the most senior person regardless of evidence.",
      "Select the cheapest option without considering service quality or risk.",
      "Define the problem, assess reliable evidence and alternatives, evaluate costs and risks, document the rationale, and monitor the result.",
      "Avoid documenting decisions to preserve flexibility."
    ],
    ans: "C",
    exp: "Evidence-based decisions compare alternatives, risks, costs, and results."
  },

  // Section H — Customer Service (76–80)
  {
    num: 76,
    section: "Section H — Customer Service",
    text: "A citizen complains that an application has exceeded the published processing time. The responsible unit is waiting for an internal approval. What is the best response?",
    options: [
      "Explain the verified status and next steps, acknowledge the delay, provide a realistic update, and escalate the internal bottleneck appropriately.",
      "Tell the citizen to contact every department independently.",
      "Mark the application complete even though it is not.",
      "Blame another employee without checking the facts."
    ],
    ans: "A",
    exp: "Accurate updates and escalation address both citizen needs and internal delays."
  },
  {
    num: 77,
    section: "Section H — Customer Service",
    text: "A citizen becomes verbally aggressive after being told that a requested service cannot be provided without required documentation. What should the employee do?",
    options: [
      "Waive the requirement to end the confrontation.",
      "Argue until the citizen admits fault.",
      "Disclose another citizen's case to demonstrate fairness.",
      "Remain professional, explain the requirement and available options, and follow safety and escalation procedures if needed."
    ],
    ans: "D",
    exp: "Professional communication and appropriate escalation maintain safety and fairness."
  },
  {
    num: 78,
    section: "Section H — Customer Service",
    text: "Which measure best evaluates service quality beyond the number of citizens served?",
    options: [
      "Number of employees assigned to the front desk",
      "A combination of timeliness, first-contact resolution, accuracy, accessibility, complaint outcomes, and user feedback",
      "Number of internal meetings held",
      "Total pages printed by the department"
    ],
    ans: "B",
    exp: "Multiple quality measures capture dimensions beyond service volume."
  },
  {
    num: 79,
    section: "Section H — Customer Service",
    text: "A citizen with a disability cannot use the institution's standard service channel. What is the best administrative response?",
    options: [
      "Reject the request because all citizens must use the same physical process.",
      "Ask the citizen to find a private intermediary without assistance.",
      "Provide a reasonable, lawful, accessible alternative while protecting privacy and applying the relevant eligibility rules.",
      "Exempt the citizen from every requirement without assessment."
    ],
    ans: "C",
    exp: "Accessible alternatives support equitable service within applicable rules."
  },
  {
    num: 80,
    section: "Section H — Customer Service",
    text: "Several citizens report the same recurring service failure. What is the most useful first step for sustainable improvement?",
    options: [
      "Analyze complaint patterns and process evidence to identify the underlying cause, then implement and monitor corrective action.",
      "Treat each complaint as unrelated without investigation.",
      "Remove the complaint channel.",
      "Increase the number of forms citizens must complete."
    ],
    ans: "A",
    exp: "Recurring complaints can reveal systemic process failures."
  },

  // Section I — Records and Information Management (81–85)
  {
    num: 81,
    section: "Section I — Records and Information Management",
    text: "An employee wants to destroy records that have reached their routine retention date, but an audit investigation involving those records is still open. What is the appropriate action?",
    options: [
      "Destroy the records because the normal retention period has expired.",
      "Delete the records from the system but retain their titles.",
      "Ask the employee involved in the investigation to decide independently.",
      "Suspend routine destruction for affected records under the applicable legal hold or preservation process until authorized release."
    ],
    ans: "D",
    exp: "A valid preservation hold overrides routine destruction while it applies."
  },
  {
    num: 82,
    section: "Section I — Records and Information Management",
    text: "Which practice best supports the authenticity and integrity of electronic records?",
    options: [
      "Allow unrestricted editing without version history.",
      "Use controlled access, metadata, audit trails, integrity controls, reliable timestamps, and documented retention procedures.",
      "Store every record only on an employee's personal computer.",
      "Permit users to delete audit logs whenever convenient."
    ],
    ans: "B",
    exp: "Access controls, metadata, and audit trails support record integrity."
  },
  {
    num: 83,
    section: "Section I — Records and Information Management",
    text: "A public institution receives a request for a record containing both disclosable administrative information and protected personal data. What is the most appropriate approach?",
    options: [
      "Reject the entire request automatically.",
      "Release the complete record without reviewing any restrictions.",
      "Assess applicable disclosure rules and provide the disclosable portion with lawful redactions where appropriate.",
      "Destroy the record to avoid disclosure obligations."
    ],
    ans: "C",
    exp: "Lawful partial disclosure and redaction can protect restricted information."
  },
  {
    num: 84,
    section: "Section I — Records and Information Management",
    text: "A digital archive contains duplicate files with conflicting names and no consistent metadata. What is the strongest corrective action?",
    options: [
      "Establish classification and naming conventions, identify authoritative versions, apply metadata standards, and document controlled migration or deduplication.",
      "Delete every file with a similar name.",
      "Rename files randomly to avoid duplication.",
      "Allow each user to develop an independent filing system."
    ],
    ans: "A",
    exp: "Classification, metadata, and controlled version management improve retrieval and integrity."
  },
  {
    num: 85,
    section: "Section I — Records and Information Management",
    text: "A records officer finds gaps in the register tracking who accessed sensitive files. What is the primary concern?",
    options: [
      "The records may take longer to print.",
      "The filing cabinet may require additional labels.",
      "The institution's internet connection may be slow.",
      "Accountability and traceability are weakened, making unauthorized access harder to detect or investigate."
    ],
    ans: "D",
    exp: "Missing access logs weaken accountability and investigation capabilities."
  },

  // Section J — Planning, Monitoring and Evaluation (86–95)
  {
    num: 86,
    section: "Section J — Planning, Monitoring and Evaluation",
    text: "A strategic plan states that an institution will “improve public service significantly” but gives no baseline, target, or deadline. What is the main weakness?",
    options: [
      "The objective is too numerical.",
      "The objective is insufficiently specific and measurable for effective monitoring and accountability.",
      "The objective already defines a complete monitoring framework.",
      "The objective should never be connected to a timeline."
    ],
    ans: "B",
    exp: "Effective objectives need clear, measurable expectations and timelines."
  },
  {
    num: 87,
    section: "Section J — Planning, Monitoring and Evaluation",
    text: "A program reports 10,000 citizens trained, but management does not know whether participants applied the skills. Which conclusion is correct?",
    options: [
      "The program's long-term impact is proven.",
      "The number trained establishes the program's cost-effectiveness.",
      "The figure is an output indicator; additional outcome evidence is needed to assess changes in skills or behavior.",
      "Training attendance is irrelevant to every evaluation."
    ],
    ans: "C",
    exp: "Participants trained are an output; skill application is an outcome."
  },
  {
    num: 88,
    section: "Section J — Planning, Monitoring and Evaluation",
    text: "A project has a planned budget of ETB 1,000,000. Its earned value is ETB 400,000 and actual cost is ETB 500,000. Using earned value management, what is its cost performance index (CPI)?",
    options: [
      "0.80",
      "1.25",
      "0.50",
      "1.00"
    ],
    ans: "A",
    exp: "CPI = earned value ÷ actual cost = 400,000 ÷ 500,000 = 0.80."
  },
  {
    num: 89,
    section: "Section J — Planning, Monitoring and Evaluation",
    text: "Using the same project data as Question 88, the planned value is ETB 450,000. What is the schedule performance index (SPI)?",
    options: [
      "1.125",
      "0.80",
      "0.50",
      "Approximately 0.89"
    ],
    ans: "D",
    exp: "SPI = earned value ÷ planned value = 400,000 ÷ 450,000 ≈ 0.89."
  },
  {
    num: 90,
    section: "Section J — Planning, Monitoring and Evaluation",
    text: "A performance indicator improves after a new policy is introduced. However, the same period also includes a large increase in staffing and a reduction in demand. What is the strongest evaluation conclusion?",
    options: [
      "The policy alone caused the improvement.",
      "The observed change cannot automatically be attributed to the policy; other contributing factors and a suitable comparison should be assessed.",
      "The indicator must be discarded.",
      "Staffing and demand have no possible effect on performance."
    ],
    ans: "B",
    exp: "Staffing and demand changes may also explain the observed improvement."
  },
  {
    num: 91,
    section: "Section J — Planning, Monitoring and Evaluation",
    text: "A monitoring report shows that a project is behind schedule, but it only reports completed activities and omits risks. What should the monitoring team recommend?",
    options: [
      "Remove the schedule from future reports.",
      "Report only positive results until the project ends.",
      "Include actual versus planned progress, variance analysis, causes, risks, corrective actions, responsible owners, and deadlines.",
      "Change the original baseline without authorization to eliminate the variance."
    ],
    ans: "C",
    exp: "Useful monitoring reports explain variances, risks, and corrective actions."
  },
  {
    num: 92,
    section: "Section J — Planning, Monitoring and Evaluation",
    text: "Which statement best distinguishes a baseline from a target?",
    options: [
      "A baseline describes the starting or reference condition; a target defines the intended future level of performance.",
      "A baseline is always the highest possible result.",
      "A target is the same as a historical observation.",
      "Neither is needed when indicators are used."
    ],
    ans: "A",
    exp: "A baseline is the reference condition; a target is the intended result."
  },
  {
    num: 93,
    section: "Section J — Planning, Monitoring and Evaluation",
    text: "An institution sets a target of resolving 95% of complaints within five working days. Which definition is essential for consistent reporting?",
    options: [
      "The name of the employee who proposed the target",
      "The total number of desks in the complaints office",
      "The number of pages in each complaint file",
      "Clear rules for the numerator, denominator, clock start and stop, eligible complaints, exclusions, and data source"
    ],
    ans: "D",
    exp: "Defined numerator, denominator, timing, and exclusions ensure consistent measurement."
  },
  {
    num: 94,
    section: "Section J — Planning, Monitoring and Evaluation",
    text: "A project repeatedly misses its output targets despite adequate funding. What should an evaluation investigate before recommending additional funding?",
    options: [
      "Whether the annual report can be shortened",
      "Implementation capacity, assumptions, procurement delays, technical design, dependencies, demand, and the validity of the original estimates",
      "Whether all targets should automatically be doubled",
      "Whether monitoring should be stopped"
    ],
    ans: "B",
    exp: "Implementation and design weaknesses should be examined before adding funds."
  },
  {
    num: 95,
    section: "Section J — Planning, Monitoring and Evaluation",
    text: "A planning officer must rank competing projects with different costs, benefits, and implementation risks. Which approach is most defensible?",
    options: [
      "Rank projects by the order in which their requests were received.",
      "Choose the most expensive project because it appears more ambitious.",
      "Apply transparent, pre-established criteria for strategic alignment, expected benefits, cost, feasibility, equity, risk, and available resources.",
      "Fund all projects equally regardless of merit or budget constraints."
    ],
    ans: "C",
    exp: "Transparent, multidimensional criteria improve project prioritization."
  },

  // Additional Cross-Functional Public-Sector Competency Questions (96–100)
  {
    num: 96,
    section: "Additional Cross-Functional Public-Sector Competency Questions",
    text: "An internal audit identifies repeated unauthorized purchases, missing store records, and payments made before receipt verification. Which corrective program is most comprehensive?",
    options: [
      "Provide a one-day awareness session and leave existing processes unchanged.",
      "Replace all storekeepers immediately without investigating control weaknesses.",
      "Increase the purchasing budget and postpone the audit findings.",
      "Map transaction controls, assign accountable owners, separate duties, standardize authorization and receipt evidence, reconcile records, and independently test remediation."
    ],
    ans: "D",
    exp: "Integrated control improvements address the connected procurement, inventory, and payment failures."
  },
  {
    num: 97,
    section: "Additional Cross-Functional Public-Sector Competency Questions",
    text: "A public institution's performance dashboard shows 100% completion, but source documents reveal that some activities were never performed. What should management do?",
    options: [
      "Validate the data against source evidence, correct the records through controlled procedures, investigate the reporting failure, and strengthen verification controls.",
      "Retain the figure because the dashboard has already been published.",
      "Delete the source documents and keep the summary.",
      "Increase the completion figure to compensate for the discrepancy."
    ],
    ans: "A",
    exp: "Reported results must be reconciled with source evidence and corrected transparently."
  },
  {
    num: 98,
    section: "Additional Cross-Functional Public-Sector Competency Questions",
    text: "A cyberattack disrupts a financial system near a reporting deadline. Staff propose using personal email accounts to exchange transaction files and passwords to maintain operations. What is the best response?",
    options: [
      "Allow unrestricted personal email use until the system returns.",
      "Share passwords with all finance staff to speed recovery.",
      "Activate the incident-response and business-continuity procedures, use authorized secure alternatives, preserve evidence, and reconcile transactions after recovery.",
      "Suspend all security monitoring to reduce system load."
    ],
    ans: "C",
    exp: "Incident response must preserve security while maintaining authorized continuity arrangements."
  },
  {
    num: 99,
    section: "Additional Cross-Functional Public-Sector Competency Questions",
    text: "A procurement project is on schedule and within budget, but the delivered system fails user acceptance testing and does not meet the approved specification. Which conclusion is most accurate?",
    options: [
      "The project is successful because time and cost targets were met.",
      "Schedule and cost performance are insufficient; conformance, acceptance, and intended operational outcomes must also be assessed.",
      "User acceptance testing should be ignored after delivery.",
      "The supplier must be paid in full regardless of contract terms."
    ],
    ans: "B",
    exp: "Cost and schedule performance do not establish quality or acceptance."
  },
  {
    num: 100,
    section: "Additional Cross-Functional Public-Sector Competency Questions",
    text: "A government program meets its annual output target, but service access remains unequal across geographic areas. Which next step best supports evidence-based planning?",
    options: [
      "Increase the overall output target without investigating distribution.",
      "Stop collecting geographic data because the aggregate target was met.",
      "Allocate all remaining resources to the area with the highest existing output.",
      "Disaggregate performance and access data, investigate barriers and underserved populations, and adjust resource allocation and interventions against transparent equity and effectiveness criteria."
    ],
    ans: "D",
    exp: "Disaggregated evidence reveals unequal access and informs targeted interventions."
  }
];

const letterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };

async function run() {
  console.log(`Starting seed for Full 1 (${rawQuestionsAndKeys.length} questions)...`);

  if (rawQuestionsAndKeys.length !== 100) {
    throw new Error(`Expected 100 questions, got ${rawQuestionsAndKeys.length}`);
  }

  // Validate questions
  for (const q of rawQuestionsAndKeys) {
    if (!q.ans || letterToIndex[q.ans] === undefined) {
      throw new Error(`Invalid answer key for Q${q.num}: ${q.ans}`);
    }
    if (q.options.length !== 4) {
      throw new Error(`Question ${q.num} does not have 4 options`);
    }
  }

  const now = new Date().toISOString();
  const authorId = 'e6a0cc7f-1d9c-45ed-8139-457031b71f3c'; // Admin

  const categoryId = 'ad842eb6-4202-4a57-ae73-007ede7ea79f'; // Behavioral Competency
  const subjectSlug = 'full-1';
  const subjectName = 'Full 1';

  const examSlug = 'full-1';
  const examName = 'Full 1';
  const examDesc = 'Comprehensive 100-question multidisciplinary examination covering Public-Service Knowledge, IT & ICT Competencies, Accounting & Finance, Procurement, Property & Stores Logistics, HR Management, Management & Administration, Customer Service, Records Management, Planning & M&E, and Cross-Functional Scenarios.';

  // 1. SQLite database
  const sqliteDb = new DatabaseSync(path.resolve(__dirname, '../prisma/exam.db'));

  // Ensure Subject
  let subRow = sqliteDb.prepare('SELECT id FROM Subject WHERE slug = ?').get(subjectSlug);
  let subjectId;
  if (!subRow) {
    subjectId = crypto.randomUUID();
    sqliteDb.prepare(`
      INSERT INTO Subject (id, slug, name, categoryId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(subjectId, subjectSlug, subjectName, categoryId, now, now);
    console.log(`Created Subject '${subjectName}' in SQLite with id ${subjectId}`);
  } else {
    subjectId = subRow.id;
    sqliteDb.prepare('UPDATE Subject SET categoryId = ?, name = ?, updatedAt = ? WHERE id = ?').run(categoryId, subjectName, now, subjectId);
    console.log(`Subject '${subjectName}' already exists in SQLite with id ${subjectId}`);
  }

  // Ensure ExamTemplate
  let examRow = sqliteDb.prepare('SELECT id FROM ExamTemplate WHERE slug = ?').get(examSlug);
  let examTemplateId;
  if (!examRow) {
    examTemplateId = crypto.randomUUID();
    sqliteDb.prepare(`
      INSERT INTO ExamTemplate (
        id, slug, name, categoryId, subjectId, topicWeights, totalQuestions, durationMinutes,
        marksPerQuestion, negativeMarking, difficultyDistribution, randomizeQuestions,
        randomizeOptions, avoidPreviouslySeen, allowReuse, autoSubmitOnExpiry,
        passThresholdPercent, description, isPublic, publishedAt, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, NULL, 100, 120,
        1, 0, NULL, 1,
        1, 0, 0, 1,
        70, ?, 1, ?, ?, ?
      )
    `).run(examTemplateId, examSlug, examName, categoryId, subjectId, examDesc, now, now, now);
    console.log(`Created ExamTemplate '${examName}' in SQLite with id ${examTemplateId}`);
  } else {
    examTemplateId = examRow.id;
    sqliteDb.prepare(`
      UPDATE ExamTemplate SET
        name = ?, categoryId = ?, subjectId = ?, totalQuestions = 100,
        durationMinutes = 120, description = ?, isPublic = 1, updatedAt = ?
      WHERE id = ?
    `).run(examName, categoryId, subjectId, examDesc, now, examTemplateId);
    console.log(`Updated ExamTemplate '${examName}' in SQLite with id ${examTemplateId}`);
  }

  // Delete previous questions for this subject in SQLite
  sqliteDb.prepare('DELETE FROM Question WHERE subjectId = ?').run(subjectId);

  const insertQStmt = sqliteDb.prepare(`
    INSERT INTO Question (
      id, questionId, questionText, categoryId, subjectId, topicId, difficulty, questionType,
      options, correctOptionIndices, explanation, marks, negativeMarks, tags,
      learningObjectives, source, authorId, status, publishedAt, archivedAt,
      importId, canonicalIndices, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, NULL, 'INTERMEDIATE', 'SINGLE_CHOICE',
      ?, ?, ?, 1, NULL, ?,
      NULL, 'Full 1', ?, 'PUBLISHED', ?, NULL,
      NULL, '[0,1,2,3]', ?, ?
    )
  `);

  const preparedQuestions = [];
  for (const q of rawQuestionsAndKeys) {
    const qId = crypto.randomUUID();
    const optJson = JSON.stringify(q.options);
    const correctIdx = letterToIndex[q.ans];
    const ansJson = JSON.stringify([correctIdx]);
    const tagsJson = JSON.stringify([q.section, "Full 1", "comprehensive"]);
    const explanation = q.exp ? `${q.exp} (Correct: ${q.ans})` : `Correct answer: ${q.ans}`;

    insertQStmt.run(
      qId, qId, q.text, categoryId, subjectId,
      optJson, ansJson, explanation, tagsJson,
      authorId, now, now, now
    );

    preparedQuestions.push({
      id: qId,
      num: q.num,
      section: q.section,
      text: q.text,
      options: optJson,
      correct: ansJson,
      correctLetter: q.ans,
      explanation,
      tags: tagsJson
    });
  }
  console.log(`Successfully inserted ${preparedQuestions.length} questions into SQLite.`);

  // 2. PostgreSQL (Supabase)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const pgSubRes = await pool.query('SELECT id FROM "Subject" WHERE slug = $1', [subjectSlug]);
    let pgSubjectId = subjectId;
    if (pgSubRes.rows.length === 0) {
      await pool.query(`
        INSERT INTO "Subject" (id, slug, name, "categoryId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [pgSubjectId, subjectSlug, subjectName, categoryId, now, now]);
      console.log(`Created Subject '${subjectName}' in Supabase`);
    } else {
      pgSubjectId = pgSubRes.rows[0].id;
      await pool.query(`
        UPDATE "Subject" SET "categoryId" = $1, name = $2, "updatedAt" = $3 WHERE id = $4
      `, [categoryId, subjectName, now, pgSubjectId]);
      console.log(`Updated Subject '${subjectName}' in Supabase`);
    }

    const pgExamRes = await pool.query('SELECT id FROM "ExamTemplate" WHERE slug = $1', [examSlug]);
    let pgExamId = examTemplateId;
    if (pgExamRes.rows.length === 0) {
      await pool.query(`
        INSERT INTO "ExamTemplate" (
          id, slug, name, "categoryId", "subjectId", "topicWeights", "totalQuestions", "durationMinutes",
          "marksPerQuestion", "negativeMarking", "difficultyDistribution", "randomizeQuestions",
          "randomizeOptions", "avoidPreviouslySeen", "allowReuse", "autoSubmitOnExpiry",
          "passThresholdPercent", description, "isPublic", "publishedAt", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, NULL, 100, 120,
          1, false, NULL, true,
          true, false, false, true,
          70, $6, true, $7, $8, $9
        )
      `, [pgExamId, examSlug, examName, categoryId, pgSubjectId, examDesc, now, now, now]);
      console.log(`Created ExamTemplate '${examName}' in Supabase`);
    } else {
      pgExamId = pgExamRes.rows[0].id;
      await pool.query(`
        UPDATE "ExamTemplate" SET
          name = $1, "categoryId" = $2, "subjectId" = $3, "totalQuestions" = 100,
          "durationMinutes" = 120, description = $4, "isPublic" = true, "updatedAt" = $5
        WHERE id = $6
      `, [examName, categoryId, pgSubjectId, examDesc, now, pgExamId]);
      console.log(`Updated ExamTemplate '${examName}' in Supabase`);
    }

    // Clear existing questions for this subject in Supabase
    await pool.query('DELETE FROM "Question" WHERE "subjectId" = $1', [pgSubjectId]);

    // Insert all questions into Supabase
    for (const q of preparedQuestions) {
      await pool.query(`
        INSERT INTO "Question" (
          id, "questionId", "questionText", "categoryId", "subjectId", "topicId", difficulty, "questionType",
          options, "correctOptionIndices", explanation, marks, "negativeMarks", tags,
          "learningObjectives", source, "authorId", status, "publishedAt", "archivedAt",
          "importId", "canonicalIndices", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, NULL, 'INTERMEDIATE', 'SINGLE_CHOICE',
          $6, $7, $8, 1, NULL, $9,
          NULL, 'Full 1', $10, 'PUBLISHED', $11, NULL,
          NULL, '[0,1,2,3]', $12, $13
        )
      `, [
        q.id, q.id, q.text, categoryId, pgSubjectId,
        q.options, q.correct, q.explanation, q.tags,
        authorId, now, now, now
      ]);
    }
    console.log(`Successfully inserted ${preparedQuestions.length} questions into Supabase PostgreSQL.`);
  } finally {
    await pool.end();
  }

  // 3. Write files to full-1 folder
  const full1Dir = path.resolve(__dirname, '../../full-1');
  if (!fs.existsSync(full1Dir)) {
    fs.mkdirSync(full1Dir, { recursive: true });
  }

  // Markdown
  let md = `# Full 1 — Examination\n\n`;
  md += `**Exam Name:** Full 1\n`;
  md += `**Subject:** Full 1\n`;
  md += `**Total Questions:** 100\n`;
  md += `**Duration:** 120 minutes\n\n`;
  md += `---\n\n`;

  let currSection = "";
  for (const q of rawQuestionsAndKeys) {
    if (q.section !== currSection) {
      currSection = q.section;
      md += `\n## ${currSection}\n\n`;
    }
    md += `### ${q.num}. ${q.text}\n\n`;
    ['A', 'B', 'C', 'D'].forEach((l, i) => {
      md += `${l}. ${q.options[i]}\n`;
    });
    md += `\n`;
  }

  md += `\n---\n\n## Complete Answer Key with Explanations\n\n`;
  for (const q of rawQuestionsAndKeys) {
    md += `- **Q${q.num}:** **${q.ans}** — ${q.exp}\n`;
  }

  const mdPath = path.join(full1Dir, 'full-1.md');
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`Written ${mdPath}`);

  // JSON export
  const jsonExport = {
    examName: "Full 1",
    totalQuestions: 100,
    durationMinutes: 120,
    questions: rawQuestionsAndKeys.map(q => ({
      num: q.num,
      section: q.section,
      text: q.text,
      options: q.options,
      correctAnswer: q.ans,
      correctIndex: letterToIndex[q.ans],
      explanation: q.exp
    }))
  };

  const jsonPath = path.join(full1Dir, 'full-1.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonExport, null, 2), 'utf8');
  console.log(`Written ${jsonPath}`);

  console.log("\nAll operations for Full 1 completed successfully!");
}

run().catch((err) => {
  console.error("Error during seeding Full 1:", err);
  process.exit(1);
});
