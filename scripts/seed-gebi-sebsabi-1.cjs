const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');

const answersKey = {
  // Technical Questions 101–200
  101: 'B', 102: 'C', 103: 'A', 104: 'C', 105: 'B', 106: 'C', 107: 'D', 108: 'B', 109: 'A', 110: 'C',
  111: 'A', 112: 'B', 113: 'C', 114: 'B', 115: 'C', 116: 'B', 117: 'C', 118: 'A', 119: 'A', 120: 'C',
  121: 'B', 122: 'C', 123: 'C', 124: 'B', 125: 'C', 126: 'A', 127: 'B', 128: 'B', 129: 'C', 130: 'B',
  131: 'C', 132: 'B', 133: 'B', 134: 'C', 135: 'B', 136: 'B', 137: 'C', 138: 'A', 139: 'B', 140: 'C',
  141: 'A', 142: 'C', 143: 'A', 144: 'B', 145: 'B', 146: 'B', 147: 'A', 148: 'B', 149: 'C', 150: 'C',
  151: 'A', 152: 'B', 153: 'C', 154: 'B', 155: 'B', 156: 'B', 157: 'C', 158: 'A', 159: 'B', 160: 'C',
  161: 'C', 162: 'B', 163: 'C', 164: 'C', 165: 'B', 166: 'C', 167: 'B', 168: 'C', 169: 'C', 170: 'B',
  171: 'C', 172: 'B', 173: 'B', 174: 'B', 175: 'C', 176: 'A', 177: 'B', 178: 'C', 179: 'B', 180: 'B',
  181: 'A', 182: 'B', 183: 'C', 184: 'B', 185: 'C', 186: 'C', 187: 'B', 188: 'C', 189: 'B', 190: 'B',
  191: 'A', 192: 'C', 193: 'D', 194: 'C', 195: 'A', 196: 'B', 197: 'D', 198: 'C', 199: 'C', 200: 'B',

  // Behavioral Questions B1–B50
  'B1': 'B', 'B2': 'C', 'B3': 'B', 'B4': 'C', 'B5': 'B', 'B6': 'C', 'B7': 'B', 'B8': 'C', 'B9': 'B', 'B10': 'C',
  'B11': 'B', 'B12': 'C', 'B13': 'B', 'B14': 'C', 'B15': 'C', 'B16': 'B', 'B17': 'C', 'B18': 'B', 'B19': 'C', 'B20': 'B',
  'B21': 'B', 'B22': 'B', 'B23': 'C', 'B24': 'B', 'B25': 'C', 'B26': 'B', 'B27': 'C', 'B28': 'B', 'B29': 'C', 'B30': 'B',
  'B31': 'C', 'B32': 'B', 'B33': 'C', 'B34': 'B', 'B35': 'C', 'B36': 'B', 'B37': 'B', 'B38': 'C', 'B39': 'B', 'B40': 'C',
  'B41': 'B', 'B42': 'C', 'B43': 'C', 'B44': 'B', 'B45': 'B', 'B46': 'C', 'B47': 'B', 'B48': 'C', 'B49': 'B', 'B50': 'C'
};

const rawTechnical = [
  {
    num: 101,
    text: "Which source document most directly supports recording that goods were received from a supplier?",
    options: [
      "Employee leave form",
      "Goods-received note or inspection/acceptance record",
      "Bank reconciliation",
      "Cash-flow forecast"
    ]
  },
  {
    num: 102,
    text: "A supplier invoice is ETB 74,500, but the purchase order authorizes only ETB 70,000. What should happen first?",
    options: [
      "Pay the invoice to avoid delay",
      "Change the purchase order without approval",
      "Investigate the variance and obtain authorized resolution",
      "Charge the difference to miscellaneous expense"
    ]
  },
  {
    num: 103,
    text: "A journal entry debits expense ETB 18,000 and credits cash ETB 81,000. What is the immediate accounting issue?",
    options: [
      "Debits and credits do not balance",
      "The entry is balanced",
      "Cash is correctly recorded",
      "Revenue is understated"
    ]
  },
  {
    num: 104,
    text: "Which is the correct entry when an institution pays a previously recorded supplier liability?",
    options: [
      "Debit cash; credit payable",
      "Debit expense; credit revenue",
      "Debit payable; credit cash",
      "Debit receivable; credit cash"
    ]
  },
  {
    num: 105,
    text: "A payment authorization is complete, but the expenditure is prohibited by the grant agreement. What should the accountant do?",
    options: [
      "Pay because approval exists",
      "Hold the payment and resolve eligibility under applicable rules",
      "Charge any other available project",
      "Record it as revenue"
    ]
  },
  {
    num: 106,
    text: "The general ledger accounts payable control is ETB 900,000, while supplier subsidiary balances total ETB 875,000. What is the difference?",
    options: [
      "ETB 15,000",
      "ETB 20,000",
      "ETB 25,000",
      "ETB 35,000"
    ]
  },
  {
    num: 107,
    text: "Which account normally has a credit balance?",
    options: [
      "Cash",
      "Prepaid rent",
      "Accounts receivable",
      "Accounts payable"
    ]
  },
  {
    num: 108,
    text: "A transaction is posted to the wrong expense account but for the correct amount and side. What is the likely effect on the trial balance?",
    options: [
      "It must be out of balance",
      "It may still balance",
      "Total debits will be zero",
      "Cash will automatically be wrong"
    ]
  },
  {
    num: 109,
    text: "A bank statement shows a deposit that is absent from the cash book. Which is the best initial action?",
    options: [
      "Investigate whether it is a direct deposit or other unrecorded credit and update the books with evidence",
      "Ignore it",
      "Record it as a liability automatically",
      "Change the bank statement"
    ]
  },
  {
    num: 110,
    text: "A cash-book balance is ETB 240,000. Bank fees are ETB 1,500 and bank interest is ETB 2,200, neither recorded. What is the adjusted cash-book balance?",
    options: [
      "ETB 236,300",
      "ETB 238,500",
      "ETB 240,700",
      "ETB 243,700"
    ]
  },
  {
    num: 111,
    text: "A bank reconciliation lists a deposit in transit. How is it generally treated?",
    options: [
      "Added to the bank-statement balance when reconciling to the adjusted bank balance",
      "Deducted from the cash-book balance",
      "Recorded as an expense",
      "Written off"
    ]
  },
  {
    num: 112,
    text: "Outstanding checks are ETB 32,000; deposits in transit are ETB 14,000; bank statement balance is ETB 190,000. Adjusted bank balance is:",
    options: [
      "ETB 144,000",
      "ETB 172,000",
      "ETB 208,000",
      "ETB 236,000"
    ]
  },
  {
    num: 113,
    text: "What is the strongest explanation for a persistent unreconciled difference?",
    options: [
      "The balance must be correct",
      "It should be hidden in suspense forever",
      "It requires investigation and evidence-based resolution",
      "It proves that revenue is overstated"
    ]
  },
  {
    num: 114,
    text: "A cash receipt of ETB 12,400 is omitted from the books but appears on the bank statement. Which is the likely book entry if it represents collection of an existing receivable?",
    options: [
      "Debit accounts receivable; credit cash",
      "Debit cash; credit accounts receivable",
      "Debit expense; credit payable",
      "Debit payable; credit revenue"
    ]
  },
  {
    num: 115,
    text: "Which control best reduces the risk of a fictitious payment?",
    options: [
      "One person creates vendors, approves invoices, releases cash, and reconciles the bank",
      "No supporting documents for small transactions",
      "Independent vendor verification and segregation of duties",
      "Monthly reconciliation only by the payment preparer"
    ]
  },
  {
    num: 116,
    text: "A service was received in December but the invoice arrives in January. Under accrual accounting, what is generally required at December 31?",
    options: [
      "No entry until payment",
      "Record expense and accrued payable",
      "Record prepaid expense",
      "Record revenue"
    ]
  },
  {
    num: 117,
    text: "An annual insurance premium of ETB 96,000 is paid on July 1. At December 31, how much insurance expense has accrued, assuming monthly allocation?",
    options: [
      "ETB 24,000",
      "ETB 36,000",
      "ETB 48,000",
      "ETB 96,000"
    ]
  },
  {
    num: 118,
    text: "Equipment costs ETB 720,000, residual value ETB 120,000, useful life 5 years. Annual straight-line depreciation is:",
    options: [
      "ETB 120,000",
      "ETB 144,000",
      "ETB 600,000",
      "ETB 168,000"
    ]
  },
  {
    num: 119,
    text: "An asset costing ETB 400,000 is incorrectly expensed. What is the likely immediate effect, before depreciation and tax effects?",
    options: [
      "Assets and profit are understated",
      "Assets and profit are overstated",
      "Liabilities are understated only",
      "Cash is overstated"
    ]
  },
  {
    num: 120,
    text: "A trial balance agrees. Which error may still exist?",
    options: [
      "A debit is posted with no credit",
      "A debit of 5,000 and credit of 4,000 are posted",
      "An entire transaction is omitted",
      "The debit column is not totaled"
    ]
  },
  {
    num: 121,
    text: "Opening receivables are ETB 180,000; credit sales ETB 620,000; collections ETB 540,000; write-offs ETB 10,000. Closing gross receivables are:",
    options: [
      "ETB 250,000",
      "ETB 260,000",
      "ETB 270,000",
      "ETB 1,350,000"
    ]
  },
  {
    num: 122,
    text: "Receivables total ETB 800,000 and the required allowance is 3%. No allowance currently exists. Required allowance is:",
    options: [
      "ETB 8,000",
      "ETB 16,000",
      "ETB 24,000",
      "ETB 776,000"
    ]
  },
  {
    num: 123,
    text: "Under the allowance method, writing off a receivable already covered by an adequate allowance generally debits:",
    options: [
      "Bad debt expense",
      "Cash",
      "Allowance for doubtful accounts",
      "Sales revenue"
    ]
  },
  {
    num: 124,
    text: "Which report helps prioritize collection activity?",
    options: [
      "Fixed asset register",
      "Accounts receivable aging report",
      "Payroll register",
      "Bank deposit book only"
    ]
  },
  {
    num: 125,
    text: "Which is the most appropriate response to a supplier invoice for goods not received?",
    options: [
      "Pay immediately",
      "Record as a valid expense",
      "Verify delivery and resolve the discrepancy before payment",
      "Delete the vendor"
    ]
  },
  {
    num: 126,
    text: "A payable of ETB 375,000 is partly settled by ETB 128,000. Remaining payable is:",
    options: [
      "ETB 247,000",
      "ETB 253,000",
      "ETB 375,000",
      "ETB 503,000"
    ]
  },
  {
    num: 127,
    text: "An accounts payable aging report is most useful for:",
    options: [
      "Calculating depreciation",
      "Tracking overdue liabilities and payment priorities",
      "Calculating payroll tax only",
      "Estimating asset residual values"
    ]
  },
  {
    num: 128,
    text: "A vendor balance is posted to the wrong supplier subledger, while the control account is correct. The main issue is:",
    options: [
      "Total liabilities are necessarily wrong",
      "Individual supplier balances are inaccurate",
      "Cash is necessarily understated",
      "Revenue is necessarily overstated"
    ]
  },
  {
    num: 129,
    text: "A receivable has been disputed by the customer for 14 months. What is the best action?",
    options: [
      "Automatically write it off",
      "Ignore the dispute",
      "Investigate documentation, confirm the balance, and assess collectability",
      "Reclassify it as cash"
    ]
  },
  {
    num: 130,
    text: "Which evidence best supports a supplier liability?",
    options: [
      "A verbal statement alone",
      "Invoice matched with purchase authorization and receipt evidence where applicable",
      "Employee attendance sheet",
      "Cash forecast"
    ]
  },
  {
    num: 131,
    text: "Gross salary is ETB 34,500 and deductions are ETB 5,250. Net salary is:",
    options: [
      "ETB 39,750",
      "ETB 34,500",
      "ETB 29,250",
      "ETB 5,250"
    ]
  },
  {
    num: 132,
    text: "A former employee appears on the current payroll. What is the proper response?",
    options: [
      "Pay automatically",
      "Verify employment status and authorized payroll records before payment",
      "Transfer salary to another employee",
      "Delete the entire payroll"
    ]
  },
  {
    num: 133,
    text: "Which is the strongest control against fictitious employees?",
    options: [
      "Shared passwords",
      "Independent HR verification and separation of employee setup from payroll approval",
      "Cash payments without receipts",
      "Removing employee IDs"
    ]
  },
  {
    num: 134,
    text: "A payment exceeds the Accountant III’s delegated approval limit. What should happen?",
    options: [
      "Split it into smaller payments",
      "Approve it if the invoice is correct",
      "Refer it to the official with appropriate authority",
      "Ask the supplier to approve it"
    ]
  },
  {
    num: 135,
    text: "A proposed payment exceeds the available budget by ETB 18,500. The accountant should:",
    options: [
      "Hide the excess",
      "Verify budget availability and seek authorized resolution before commitment/payment",
      "Charge it to an unrelated grant",
      "Record it as revenue"
    ]
  },
  {
    num: 136,
    text: "The purpose of a payment voucher is primarily to:",
    options: [
      "Replace the annual budget",
      "Document the transaction, evidence, coding, and authorization for payment",
      "Confirm the supplier paid the institution",
      "Eliminate ledger posting"
    ]
  },
  {
    num: 137,
    text: "Which is most important when checking grant-funded expenditure?",
    options: [
      "Whether cash is available only",
      "Whether the supplier prefers fast payment",
      "Eligibility, budget availability, documentation, and approvals under the agreement",
      "Whether the invoice looks professional"
    ]
  },
  {
    num: 138,
    text: "A bank account receives ETB 48,000 directly from a customer to settle an existing receivable. The entry is:",
    options: [
      "Debit cash; credit accounts receivable",
      "Debit accounts receivable; credit cash",
      "Debit expense; credit cash",
      "Debit cash; credit payable"
    ]
  },
  {
    num: 139,
    text: "Which sequence best describes normal transaction processing?",
    options: [
      "Financial report, source document, ledger, journal",
      "Source document, journal entry, ledger posting, trial balance, adjustments, reporting",
      "Bank reconciliation, invoice creation, budget approval",
      "Trial balance, payment, source document"
    ]
  },
  {
    num: 140,
    text: "What is the main purpose of a trial balance?",
    options: [
      "Prove all transactions are genuine",
      "Confirm there is no fraud",
      "List ledger balances and test equality of total debits and credits",
      "Replace the ledger"
    ]
  },
  {
    num: 141,
    text: "An expense of ETB 22,000 is posted to the wrong expense account. The debit and credit totals remain correct. The trial balance will usually:",
    options: [
      "Still agree",
      "Be out by ETB 22,000",
      "Show no cash balance",
      "Show double revenue"
    ]
  },
  {
    num: 142,
    text: "A monthly financial report contains an unexplained material difference. The accountant should:",
    options: [
      "Force it to balance with miscellaneous income",
      "Conceal it until the next quarter",
      "Investigate, document the status, and escalate before finalization",
      "Delete the report"
    ]
  },
  {
    num: 143,
    text: "Actual expenditure is ETB 680,000 and budget is ETB 750,000. Underspending is:",
    options: [
      "ETB 70,000",
      "ETB 680,000",
      "ETB 750,000",
      "ETB 1,430,000"
    ]
  },
  {
    num: 144,
    text: "Actual revenue is ETB 950,000 against a target of ETB 1,000,000. Revenue shortfall is:",
    options: [
      "ETB 5,000",
      "ETB 50,000",
      "ETB 950,000",
      "ETB 1,950,000"
    ]
  },
  {
    num: 145,
    text: "A budget utilization rate is calculated as:",
    options: [
      "Budget divided by actual expenditure × 100",
      "Actual expenditure divided by approved budget × 100",
      "Actual revenue minus liabilities",
      "Cash divided by receivables"
    ]
  },
  {
    num: 146,
    text: "A project budget is ETB 3,000,000, eligible expenditure is ETB 1,950,000, and outstanding commitments are ETB 250,000. Uncommitted budget is:",
    options: [
      "ETB 1,050,000",
      "ETB 800,000",
      "ETB 1,300,000",
      "ETB 2,750,000"
    ]
  },
  {
    num: 147,
    text: "Which information best supports a cash-flow forecast?",
    options: [
      "Expected receipts, payment due dates, payroll, supplier obligations, and opening cash",
      "Office furniture list only",
      "Employee education certificates",
      "Historical depreciation only"
    ]
  },
  {
    num: 148,
    text: "Why can an institution show a positive accounting result but face a cash shortage?",
    options: [
      "Profit and cash are identical",
      "Timing differences in receipts and payments can cause liquidity pressure",
      "Liabilities never require cash",
      "Receivables are always cash"
    ]
  },
  {
    num: 149,
    text: "Which control best protects the integrity of journal adjustments?",
    options: [
      "No supporting documents",
      "One shared login",
      "Documented rationale, supporting evidence, authorization, and review",
      "Deleting original entries"
    ]
  },
  {
    num: 150,
    text: "Which is the best approach to an accounting error discovered after a report has been issued?",
    options: [
      "Ignore it",
      "Delete the source document",
      "Assess materiality and applicable policy, then correct and disclose as required",
      "Change the bank statement"
    ]
  },
  {
    num: 151,
    text: "Why should collected institutional revenue be deposited promptly?",
    options: [
      "To reduce loss and misappropriation risk and support complete recording",
      "To avoid receipts",
      "To increase outstanding checks",
      "To eliminate bank reconciliation"
    ]
  },
  {
    num: 152,
    text: "What is the main reason to retain an audit trail?",
    options: [
      "To prevent any review",
      "To show who made changes and support transaction verification",
      "To replace approvals",
      "To remove responsibility"
    ]
  },
  {
    num: 153,
    text: "A bank mistakenly debits ETB 16,000 for another customer’s transaction. The accountant should:",
    options: [
      "Record a permanent expense",
      "Ignore it",
      "Notify the bank, document the error, and track correction",
      "Debit revenue"
    ]
  },
  {
    num: 154,
    text: "Which control most directly limits unauthorized vendor bank-account changes?",
    options: [
      "Accepting email requests without checking",
      "Independent callback to a trusted contact and documented approval",
      "Sharing vendor master passwords",
      "Updating accounts after payment"
    ]
  },
  {
    num: 155,
    text: "A cash book has ETB 120,000. Bank fees of ETB 800 and interest of ETB 1,300 are unrecorded. Adjusted cash book is:",
    options: [
      "ETB 118,700",
      "ETB 120,500",
      "ETB 121,300",
      "ETB 122,100"
    ]
  },
  {
    num: 156,
    text: "A check issued for ETB 7,600 was recorded as ETB 6,700. To correct the cash book, cash should be:",
    options: [
      "Increased by ETB 900",
      "Decreased by ETB 900",
      "Increased by ETB 7,600",
      "Unchanged"
    ]
  },
  {
    num: 157,
    text: "Which item is generally a bank-side reconciling item rather than a cash-book adjustment?",
    options: [
      "Bank service fee",
      "Interest credited by bank",
      "Deposit in transit",
      "Direct debit unknown to the bookkeeper"
    ]
  },
  {
    num: 158,
    text: "A customer pays ETB 42,000 in advance for services next quarter. Initial entry is:",
    options: [
      "Debit cash; credit unearned revenue",
      "Debit receivable; credit revenue",
      "Debit expense; credit cash",
      "Debit revenue; credit cash"
    ]
  },
  {
    num: 159,
    text: "An accrued utility expense is recorded by:",
    options: [
      "Debit cash; credit expense",
      "Debit utility expense; credit accrued liability",
      "Debit receivable; credit revenue",
      "Debit prepaid expense; credit cash"
    ]
  },
  {
    num: 160,
    text: "Supplies were purchased for ETB 26,000. A count shows ETB 7,500 unused at period end. If all purchases were initially expensed, the adjustment is:",
    options: [
      "Debit expense 7,500; credit cash",
      "Debit payable 7,500; credit supplies",
      "Debit supplies asset 7,500; credit supplies expense 7,500",
      "Debit cash 18,500"
    ]
  },
  {
    num: 161,
    text: "A material liability is omitted from the prior period. The accountant should:",
    options: [
      "Record it as revenue",
      "Ignore it because the period closed",
      "Assess the error under applicable accounting policy and correct with authorization",
      "Change the supplier invoice"
    ]
  },
  {
    num: 162,
    text: "Which is the best indicator that a receivable may require impairment review?",
    options: [
      "The customer paid early",
      "Long overdue balance, dispute, insolvency indicators, or failed collection attempts",
      "A recent cash receipt",
      "A valid purchase order"
    ]
  },
  {
    num: 163,
    text: "Which report is most useful for monitoring unpaid statutory deductions?",
    options: [
      "Fixed asset register",
      "Inventory report",
      "Schedule of deductions payable with due dates and remittance evidence",
      "Customer sales brochure"
    ]
  },
  {
    num: 164,
    text: "The institution receives a tax notice that conflicts with its ledger. The accountant should:",
    options: [
      "Pay without checking",
      "Ignore the notice",
      "Reconcile the notice to records, obtain supporting details, and escalate discrepancies",
      "Delete the tax payable"
    ]
  },
  {
    num: 165,
    text: "What is the most appropriate basis for writing off an uncollectible receivable?",
    options: [
      "Verbal request from the debtor",
      "Documented assessment and approval under applicable policy",
      "Convenience at year-end",
      "A desire to improve profit"
    ]
  },
  {
    num: 166,
    text: "Why should regular-budget and grant transactions be separately classified?",
    options: [
      "To obscure spending",
      "To avoid financial reporting",
      "To ensure accountability, eligibility monitoring, and funding-specific reports",
      "To combine all restrictions"
    ]
  },
  {
    num: 167,
    text: "A bank reconciliation is mathematically correct but not independently reviewed. The weakness is:",
    options: [
      "Cash is necessarily wrong",
      "No evidence of independent review",
      "All deposits are invalid",
      "The ledger cannot be used"
    ]
  },
  {
    num: 168,
    text: "A supplier gives the accountant a personal benefit to accelerate payment. The accountant should:",
    options: [
      "Accept if the invoice is valid",
      "Accept but not report it",
      "Decline and follow ethics/reporting procedures",
      "Pay the supplier first"
    ]
  },
  {
    num: 169,
    text: "A supervisor requests that the accountant approve a payment without required evidence. Best response:",
    options: [
      "Approve it to avoid conflict",
      "Create substitute documents",
      "Explain requirements, request evidence, and escalate if pressure continues",
      "Process it outside the system"
    ]
  },
  {
    num: 170,
    text: "Which duty is explicitly included in the Accountant III job description?",
    options: [
      "Approving any payment without delegation",
      "Verifying monthly payroll accuracy",
      "Setting national tax rates",
      "Auditing every bank in the country"
    ]
  },
  {
    num: 171,
    text: "According to the job description, payment approval by Accountant III is permitted when:",
    options: [
      "A supplier asks",
      "The cash balance is high",
      "The head of the institution formally delegates authority",
      "A colleague gives informal permission"
    ]
  },
  {
    num: 172,
    text: "Which best describes the purpose of subsidiary ledgers?",
    options: [
      "Replace source documents",
      "Provide detailed balances supporting control accounts",
      "Eliminate reconciliations",
      "Record only depreciation"
    ]
  },
  {
    num: 173,
    text: "A ledger balance differs from the trial balance. What is the best first step?",
    options: [
      "Post an unsupported adjustment",
      "Identify the affected accounts and trace postings and totals",
      "Delete the ledger",
      "Assume the trial balance is correct"
    ]
  },
  {
    num: 174,
    text: "Which sequence is most appropriate before a high-value payment?",
    options: [
      "Pay, then seek invoice",
      "Verify budget, eligibility, invoice, receipt evidence, coding, and approvals",
      "Record as expense and skip approval",
      "Rely on supplier's assurance"
    ]
  },
  {
    num: 175,
    text: "A 12% withholding is applied to a service payment of ETB 85,000. What is the withholding amount?",
    options: [
      "ETB 850",
      "ETB 8,500",
      "ETB 10,200",
      "ETB 12,000"
    ]
  },
  {
    num: 176,
    text: "A service invoice is ETB 160,000. A valid advance of ETB 40,000 has already been paid and must be deducted. Remaining payable before tax is:",
    options: [
      "ETB 120,000",
      "ETB 160,000",
      "ETB 200,000",
      "ETB 40,000"
    ]
  },
  {
    num: 177,
    text: "A payment request contains an arithmetic error but otherwise has valid documentation. What should happen?",
    options: [
      "Approve the original amount",
      "Correct the calculation with traceable documentation and required review before payment",
      "Ignore because documents are valid",
      "Change the bank balance"
    ]
  },
  {
    num: 178,
    text: "Which is a key feature of a reliable financial report?",
    options: [
      "Unsupported estimates",
      "Omitted unfavorable data",
      "Accuracy, completeness, timeliness, consistency, and verifiability",
      "Undocumented balancing figures"
    ]
  },
  {
    num: 179,
    text: "A payment is made from the wrong funding source. What is the best response?",
    options: [
      "Conceal it",
      "Investigate, determine eligibility and reporting impact, and process an authorized correction",
      "Delete the payment",
      "Transfer it to any project without approval"
    ]
  },
  {
    num: 180,
    text: "An invoice has been entered twice, but only one payment was made. The main correction is to:",
    options: [
      "Delete the entire supplier account",
      "Investigate and reverse the duplicate liability/expense entry with an audit trail",
      "Record a second payment",
      "Increase revenue"
    ]
  },
  {
    num: 181,
    text: "Which task most directly supports annual revenue and expenditure planning?",
    options: [
      "Providing reliable historical and forecast financial data to the planning unit",
      "Deleting old ledgers",
      "Approving supplier bank details alone",
      "Ignoring unpaid obligations"
    ]
  },
  {
    num: 182,
    text: "A cash-flow forecast shows a shortage next week, though the annual budget is balanced. The accountant should:",
    options: [
      "Ignore the forecast",
      "Analyze timing of receipts and obligations and alert responsible management",
      "Increase revenue in the ledger",
      "Delay all statutory remittances without authorization"
    ]
  },
  {
    num: 183,
    text: "Which action is appropriate when a user disputes a payment delay?",
    options: [
      "Release payment regardless of controls",
      "Refuse to explain",
      "Explain the documented requirements calmly and identify missing items and next steps",
      "Change the invoice date"
    ]
  },
  {
    num: 184,
    text: "A payment authorization has the correct amount but lacks required approval. It should be:",
    options: [
      "Processed because amount is correct",
      "Held until the required authorization is obtained",
      "Recorded as revenue",
      "Split into two payments"
    ]
  },
  {
    num: 185,
    text: "The most direct purpose of segregation of duties is to:",
    options: [
      "Increase paperwork without benefit",
      "Prevent any employee from seeing records",
      "Reduce the risk of error, fraud, and unauthorized transactions",
      "Eliminate supervision"
    ]
  },
  {
    num: 186,
    text: "Which is the best way to handle a suspected fraudulent invoice?",
    options: [
      "Accuse the supplier publicly immediately",
      "Pay it while investigating",
      "Preserve evidence, verify facts, stop processing where appropriate, and report through authorized channels",
      "Delete the email"
    ]
  },
  {
    num: 187,
    text: "A reconciliation difference is caused by a bank error. The accountant should:",
    options: [
      "Record it as institutional expense permanently",
      "Document it, notify the bank, and track correction rather than misclassifying it",
      "Ignore it forever",
      "Change the bank statement"
    ]
  },
  {
    num: 188,
    text: "A payment document is complete but the expense is outside the approved budget. The accountant should:",
    options: [
      "Approve because documents are complete",
      "Charge it to a grant without review",
      "Verify budget authority and obtain approved resolution before processing",
      "Record it as a receivable"
    ]
  },
  {
    num: 189,
    text: "Which is the most reliable proof that a payment was made?",
    options: [
      "Supplier verbal confirmation alone",
      "Approved voucher plus bank transfer/payment evidence and recorded entry",
      "Purchase requisition only",
      "Budget plan only"
    ]
  },
  {
    num: 190,
    text: "An institution's collected revenue is banked but not recorded. The principal reporting risk is:",
    options: [
      "Overstated depreciation",
      "Incomplete revenue records and inaccurate reports",
      "Overstated payroll",
      "Lower accounts payable only"
    ]
  },
  {
    num: 191,
    text: "Which item belongs in a payment review checklist?",
    options: [
      "Invoice validity, receipt evidence, budget, account code, tax treatment, approvals, and duplicate check",
      "Supplier's personal preferences only",
      "The accountant's opinion only",
      "Office seating plan"
    ]
  },
  {
    num: 192,
    text: "A payment of ETB 275,000 is made against a payable of ETB 310,000. Remaining liability is:",
    options: [
      "ETB 585,000",
      "ETB 310,000",
      "ETB 35,000",
      "ETB 45,000"
    ]
  },
  {
    num: 193,
    text: "The job description identifies annual payment documents estimated at:",
    options: [
      "ETB 20,000–40,000",
      "ETB 200,000–400,000",
      "ETB 2 million–4 million",
      "ETB 20 million–40 million"
    ]
  },
  {
    num: 194,
    text: "The job description lists the Accountant III job grade as:",
    options: [
      "Grade VII",
      "Grade IX",
      "Grade XI",
      "Grade XIV"
    ]
  },
  {
    num: 195,
    text: "The job code stated in the job description is:",
    options: [
      "02 03 03",
      "03 02 30",
      "20 30 03",
      "02 30 03"
    ]
  },
  {
    num: 196,
    text: "The qualification stated for Accountant III is:",
    options: [
      "Diploma in procurement only",
      "Bachelor’s degree in Accounting or Accounting and Finance",
      "Master’s degree in economics only",
      "Certificate in office administration"
    ]
  },
  {
    num: 197,
    text: "The required directly relevant work experience is:",
    options: [
      "One year",
      "Two years",
      "Three years",
      "Four years"
    ]
  },
  {
    num: 198,
    text: "What approximate proportion of working time is attributed to communication in the source job description?",
    options: [
      "10%",
      "20%",
      "30%",
      "60%"
    ]
  },
  {
    num: 199,
    text: "What proportion of working time is attributed to mental effort in the source?",
    options: [
      "15%",
      "40%",
      "55%",
      "90%"
    ]
  },
  {
    num: 200,
    text: "What approximate value of office equipment and materials is the role expected to safeguard?",
    options: [
      "Up to ETB 5,000",
      "Up to ETB 50,000",
      "ETB 500,000",
      "ETB 5 million"
    ]
  }
];

const rawBehavioral = [
  {
    id: "B1",
    num: 201,
    text: "A supervisor asks you to process a payment without required supporting documents. What should you do?",
    options: [
      "Process it immediately",
      "Explain the requirement, request evidence, and escalate if pressure continues",
      "Create substitute documents",
      "Ignore the request without explanation"
    ]
  },
  {
    id: "B2",
    num: 202,
    text: "A colleague repeatedly submits incomplete reconciliations. What is the best response?",
    options: [
      "Publicly embarrass the colleague",
      "Correct everything secretly forever",
      "Discuss the specific gaps, explain the standard, and agree on a follow-up process",
      "Stop preparing reconciliations"
    ]
  },
  {
    id: "B3",
    num: 203,
    text: "You discover your own calculation error in a report already sent to management. What should you do?",
    options: [
      "Hide the error",
      "Promptly inform the appropriate supervisor and issue a documented correction",
      "Blame a colleague",
      "Delete the original report"
    ]
  },
  {
    id: "B4",
    num: 204,
    text: "A supplier offers you a gift in return for faster payment. What is the best response?",
    options: [
      "Accept if the invoice is valid",
      "Accept but do not tell anyone",
      "Decline and follow the institution’s ethics/reporting procedures",
      "Approve all of the supplier’s invoices"
    ]
  },
  {
    id: "B5",
    num: 205,
    text: "A service user is angry because their payment is delayed by missing evidence. What should you do?",
    options: [
      "Argue with the person",
      "Calmly explain what is missing and how to resolve it",
      "Release payment to end the argument",
      "Refuse all future contact"
    ]
  },
  {
    id: "B6",
    num: 206,
    text: "You receive two urgent tasks with the same deadline. What is the best approach?",
    options: [
      "Choose the easier task without telling anyone",
      "Ignore one task",
      "Assess risk and deadlines, communicate with the supervisor, and agree priorities",
      "Submit incomplete work for both"
    ]
  },
  {
    id: "B7",
    num: 207,
    text: "A colleague asks you to share another employee’s payroll details without a work-related reason. You should:",
    options: [
      "Share them because you are colleagues",
      "Protect the information and follow access rules",
      "Post them in a group chat",
      "Send them to a personal email"
    ]
  },
  {
    id: "B8",
    num: 208,
    text: "You disagree with a supervisor’s interpretation of a financial directive. What should you do?",
    options: [
      "Refuse all work",
      "Argue in front of service users",
      "Present the relevant rule and evidence respectfully, then follow authorized resolution procedures",
      "Alter the directive"
    ]
  },
  {
    id: "B9",
    num: 209,
    text: "A teammate is overloaded and a deadline is approaching. What is the best response?",
    options: [
      "Ignore the problem",
      "Offer appropriate help, coordinate priorities, and preserve review quality",
      "Take over their login and approve entries",
      "Submit unverified figures"
    ]
  },
  {
    id: "B10",
    num: 210,
    text: "You suspect a coworker has deliberately falsified a voucher. What should you do first?",
    options: [
      "Publicly accuse them without checking",
      "Destroy the voucher",
      "Preserve relevant evidence, verify facts appropriately, and report through authorized channels",
      "Ignore it because the person is a friend"
    ]
  },
  {
    id: "B11",
    num: 211,
    text: "A manager asks you to make expenditure appear lower by changing classifications without evidence. You should:",
    options: [
      "Comply because management requested it",
      "Refuse falsification and explain the correct classification and reporting route",
      "Delete the records",
      "Transfer it to any account"
    ]
  },
  {
    id: "B12",
    num: 212,
    text: "You notice a new financial form could reduce repeated errors. What should you do?",
    options: [
      "Change the official form without telling anyone",
      "Keep the idea to yourself",
      "Propose the improvement, test it, and seek approval before implementation",
      "Stop using forms"
    ]
  },
  {
    id: "B13",
    num: 213,
    text: "A vendor claims payment is overdue, but your records show it was paid. What is the best response?",
    options: [
      "Pay again immediately",
      "Verify the bank evidence and ledger, then communicate the documented result",
      "Ignore the vendor",
      "Delete the payment entry"
    ]
  },
  {
    id: "B14",
    num: 214,
    text: "You make a mistake while under time pressure. What does professionalism require?",
    options: [
      "Conceal it",
      "Blame workload only",
      "Report and correct it, then improve the checking process",
      "Leave it for audit"
    ]
  },
  {
    id: "B15",
    num: 215,
    text: "A coworker asks you to approve a transaction using your credentials while they are away. You should:",
    options: [
      "Share your password",
      "Approve it to help them",
      "Refuse credential sharing and follow the authorized approval process",
      "Approve it if the amount is small"
    ]
  },
  {
    id: "B16",
    num: 216,
    text: "A senior employee dismisses a control concern you raise. What should you do?",
    options: [
      "Abandon the concern immediately",
      "Document the issue and use the appropriate escalation path",
      "Post confidential details online",
      "Alter the transaction"
    ]
  },
  {
    id: "B17",
    num: 217,
    text: "You are assigned unfamiliar accounting software. What is the best response?",
    options: [
      "Guess in the live system",
      "Refuse to learn it",
      "Seek training/documentation and test in an approved environment before processing live transactions",
      "Ask someone to share their password"
    ]
  },
  {
    id: "B18",
    num: 218,
    text: "A teammate takes credit for your work. What is the most constructive response?",
    options: [
      "Retaliate by withholding information",
      "Address the issue professionally with evidence and seek a fair resolution",
      "Publicly insult the teammate",
      "Falsify the work log"
    ]
  },
  {
    id: "B19",
    num: 219,
    text: "A payment is urgent but would breach a funding restriction. What should you do?",
    options: [
      "Pay now and explain later",
      "Reclassify it secretly",
      "Hold it, explain the restriction, and seek a compliant authorized solution",
      "Ignore the agreement"
    ]
  },
  {
    id: "B20",
    num: 220,
    text: "You have to explain a complex accounting discrepancy to a non-finance colleague. What is best?",
    options: [
      "Use unexplained jargon",
      "Explain the facts, evidence, impact, and next steps in plain language",
      "Refuse to explain",
      "Give an estimate instead of facts"
    ]
  },
  {
    id: "B21",
    num: 221,
    text: "A supervisor gives you feedback that your reconciliations lack detail. You should:",
    options: [
      "Reject the feedback automatically",
      "Ask for examples, improve the documentation, and apply the standard next time",
      "Stop preparing reconciliations",
      "Blame the reviewer"
    ]
  },
  {
    id: "B22",
    num: 222,
    text: "You notice the same error recurring each month. What is the best approach?",
    options: [
      "Fix it each time without investigation",
      "Identify the root cause and recommend a sustainable control or process change",
      "Ignore it",
      "Hide the pattern"
    ]
  },
  {
    id: "B23",
    num: 223,
    text: "A coworker asks you to backdate an approval. You should:",
    options: [
      "Do it to save time",
      "Backdate if the amount is small",
      "Refuse inaccurate documentation and follow the proper correction process",
      "Delete the approval record"
    ]
  },
  {
    id: "B24",
    num: 224,
    text: "Several departments submit reports late, putting your deadline at risk. What should you do?",
    options: [
      "Invent missing data",
      "Communicate deadlines, follow up, document missing inputs, and escalate as needed",
      "Cancel the report",
      "Submit unsupported totals"
    ]
  },
  {
    id: "B25",
    num: 225,
    text: "You are unsure whether a cost is allowable under a grant. What is best?",
    options: [
      "Assume it is allowable",
      "Charge it to another grant",
      "Check the agreement and directives and obtain clarification before processing",
      "Ask the supplier to decide"
    ]
  },
  {
    id: "B26",
    num: 226,
    text: "An employee complains that you are applying rules inconsistently. What should you do?",
    options: [
      "Dismiss the complaint",
      "Review the relevant rules and evidence, explain the decision, and correct any inconsistency found",
      "Change the rules for that person",
      "Stop communicating"
    ]
  },
  {
    id: "B27",
    num: 227,
    text: "You discover an unauthorized change in supplier bank details. What is the best response?",
    options: [
      "Pay immediately",
      "Ignore the alert",
      "Pause payment, independently verify the change, document it, and escalate if suspicious",
      "Share the vendor file publicly"
    ]
  },
  {
    id: "B28",
    num: 228,
    text: "A coworker is struggling to understand a reconciliation procedure. What should you do?",
    options: [
      "Mock them",
      "Explain the steps and evidence requirements while maintaining accountability",
      "Do all their work indefinitely without review",
      "Hide the procedure"
    ]
  },
  {
    id: "B29",
    num: 229,
    text: "Your supervisor requests a report earlier than planned, but some figures are unverified. What is best?",
    options: [
      "Invent figures to meet the deadline",
      "Submit unmarked estimates as final",
      "Explain what is verified, identify outstanding items, and agree on a reliable interim or final report",
      "Refuse to communicate"
    ]
  },
  {
    id: "B30",
    num: 230,
    text: "You find a confidential payroll file left on a shared printer. You should:",
    options: [
      "Read it out of curiosity",
      "Secure it and return it through the appropriate confidential process",
      "Photograph it",
      "Leave it for anyone to collect"
    ]
  },
  {
    id: "B31",
    num: 231,
    text: "A service user offers to pay you personally to speed up a payment. You should:",
    options: [
      "Accept if you work faster",
      "Negotiate the amount",
      "Decline and report according to ethics rules",
      "Accept and keep it private"
    ]
  },
  {
    id: "B32",
    num: 232,
    text: "A colleague proposes skipping a bank reconciliation because the month is busy. What is best?",
    options: [
      "Agree automatically",
      "Explain the control requirement and plan the work to complete it on time or escalate resource constraints",
      "Reconcile only if an auditor asks",
      "Make up a balance"
    ]
  },
  {
    id: "B33",
    num: 233,
    text: "You receive contradictory instructions from two managers. What should you do?",
    options: [
      "Choose whichever is easier",
      "Carry out both even if they conflict",
      "Clarify authority and requirements with the relevant supervisors before proceeding",
      "Ignore both"
    ]
  },
  {
    id: "B34",
    num: 234,
    text: "A supplier is a relative of yours and submits a payment claim. What is the best action?",
    options: [
      "Process it without disclosure",
      "Disclose the conflict and follow the institution’s conflict-of-interest and review procedures",
      "Reject it automatically without checking",
      "Alter the invoice"
    ]
  },
  {
    id: "B35",
    num: 235,
    text: "You are asked to train a new employee in payment documentation. What is the best approach?",
    options: [
      "Give them your password",
      "Tell them to learn by making mistakes on live payments",
      "Explain the process, controls, evidence requirements, and escalation steps; review their initial work",
      "Let them approve payments immediately"
    ]
  },
  {
    id: "B36",
    num: 236,
    text: "A reconciliation reveals a large unexplained variance near month-end. What should you prioritize?",
    options: [
      "Hide it until next month",
      "Investigate promptly, preserve evidence, and escalate material unresolved differences",
      "Post a balancing figure",
      "Change the bank statement"
    ]
  },
  {
    id: "B37",
    num: 237,
    text: "You realize a report you prepared contains a typo in a non-financial heading but no numerical errors. What is best?",
    options: [
      "Ignore all quality checks",
      "Correct it according to document-control practice and ensure the right version is circulated",
      "Delete all reports",
      "Change the figures too"
    ]
  },
  {
    id: "B38",
    num: 238,
    text: "A colleague asks you to use their login to access a restricted accounting module. You should:",
    options: [
      "Use it if they trust you",
      "Use it only at lunchtime",
      "Follow access procedures and request your own authorized permissions",
      "Share your own login in return"
    ]
  },
  {
    id: "B39",
    num: 239,
    text: "Management wants a clear explanation of why actual expenditure is below budget. What should you do?",
    options: [
      "Assume staff did not work",
      "Analyze actuals, commitments, implementation delays, and timing differences using evidence",
      "Change the budget to actual",
      "Ignore the question"
    ]
  },
  {
    id: "B40",
    num: 240,
    text: "A payment is fully documented but the supplier’s account is on hold due to a verified fraud alert. What should you do?",
    options: [
      "Pay because documents are complete",
      "Bypass the hold",
      "Follow the fraud-alert process and obtain clearance before payment",
      "Delete the alert"
    ]
  },
  {
    id: "B41",
    num: 241,
    text: "A coworker criticizes your work in a meeting. What is the most professional response?",
    options: [
      "Respond with personal insults",
      "Listen, ask for specific evidence, and address the issue calmly",
      "Leave without explanation",
      "Retaliate later"
    ]
  },
  {
    id: "B42",
    num: 242,
    text: "You have found a way to automate a repetitive reconciliation step. What should you do?",
    options: [
      "Deploy it without testing",
      "Keep it secret",
      "Document the proposal, test accuracy and controls, and obtain approval before use",
      "Remove all manual review immediately"
    ]
  },
  {
    id: "B43",
    num: 243,
    text: "A service user requests an exception to a financial rule due to personal hardship. What should you do?",
    options: [
      "Ignore the person",
      "Make an unauthorized exception",
      "Respond empathetically, explain the rule, and refer any legitimate exception request to the authorized decision-maker",
      "Alter the record"
    ]
  },
  {
    id: "B44",
    num: 244,
    text: "You suspect your workload is causing repeated errors. What is the best response?",
    options: [
      "Hide the errors",
      "Review the causes, introduce checklists or review points, and discuss workload/priorities with your supervisor",
      "Stop recording transactions",
      "Blame the software automatically"
    ]
  },
  {
    id: "B45",
    num: 245,
    text: "A manager asks for the original version of a corrected report. What should you do?",
    options: [
      "Delete the original",
      "Provide the controlled record with its correction history according to policy",
      "Recreate it from memory",
      "Refuse all access"
    ]
  },
  {
    id: "B46",
    num: 246,
    text: "A coworker asks you to sign that you reviewed a reconciliation you have not checked. You should:",
    options: [
      "Sign to help the team",
      "Sign if the preparer is experienced",
      "Decline until you have performed the review and verified the evidence",
      "Ask them to sign for you"
    ]
  },
  {
    id: "B47",
    num: 247,
    text: "You need to tell a supplier that payment cannot proceed because required evidence is missing. What is best?",
    options: [
      "Give no explanation",
      "Explain the missing evidence and the process for resubmission clearly and respectfully",
      "Blame another department without checking",
      "Promise a date you cannot guarantee"
    ]
  },
  {
    id: "B48",
    num: 248,
    text: "A new directive changes the required payment review procedure. What should you do?",
    options: [
      "Continue using the old process indefinitely",
      "Apply the change only when convenient",
      "Read the directive, confirm implementation requirements, update your process, and communicate relevant changes",
      "Delete the old records"
    ]
  },
  {
    id: "B49",
    num: 249,
    text: "You identify a possible conflict between a manager’s verbal instruction and written financial rules. What should you do?",
    options: [
      "Follow the verbal instruction without question",
      "Clarify the conflict, refer to the written requirements, document the guidance, and escalate if needed",
      "Ignore the written rule",
      "Ask the supplier what to do"
    ]
  },
  {
    id: "B50",
    num: 250,
    text: "A junior colleague makes a genuine error and immediately reports it. What is the best response?",
    options: [
      "Punish them for reporting",
      "Hide the error",
      "Correct it through the proper process and use it to reinforce preventive checks",
      "Ignore the error"
    ]
  }
];

const letterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };

async function run() {
  console.log(`Starting seed for ገቢ ሰብሳቢ ሠራተኛ I (${rawTechnical.length} technical + ${rawBehavioral.length} behavioral = ${rawTechnical.length + rawBehavioral.length} questions)...`);

  const allQuestions = [];
  
  // Add Technical
  for (const q of rawTechnical) {
    const ansKey = answersKey[q.num];
    if (!ansKey || letterToIndex[ansKey] === undefined) {
      throw new Error(`Missing or invalid answer for Q${q.num}: ${ansKey}`);
    }
    allQuestions.push({
      displayNum: q.num,
      text: q.text,
      options: q.options,
      correctLetter: ansKey,
      correctIndex: letterToIndex[ansKey],
      section: "Technical Questions"
    });
  }

  // Add Behavioral
  for (const q of rawBehavioral) {
    const ansKey = answersKey[q.id];
    if (!ansKey || letterToIndex[ansKey] === undefined) {
      throw new Error(`Missing or invalid answer for ${q.id}: ${ansKey}`);
    }
    allQuestions.push({
      displayNum: q.id,
      text: q.text,
      options: q.options,
      correctLetter: ansKey,
      correctIndex: letterToIndex[ansKey],
      section: "Behavioral and Situational Judgment"
    });
  }

  if (allQuestions.length !== 150) {
    throw new Error(`Expected 150 questions, got ${allQuestions.length}`);
  }

  const now = new Date().toISOString();
  const authorId = 'e6a0cc7f-1d9c-45ed-8139-457031b71f3c'; // Admin

  const categorySlug = 'accounting';
  const categoryName = 'Accounting';

  const subjectSlug = 'gebi-sebsabi-seretenya-1';
  const subjectName = 'ገቢ ሰብሳቢ ሠራተኛ I';

  const examSlug = 'gebi-sebsabi-seretenya-1';
  const examName = 'ገቢ ሰብሳቢ ሠራተኛ I';
  const examDesc = 'Comprehensive 150-question practice examination for ገቢ ሰብሳቢ ሠራተኛ I, covering 100 Technical Accounting & Financial Controls questions and 50 Behavioral & Situational Judgment questions.';

  // 1. SQLite database
  const sqliteDb = new DatabaseSync(path.resolve(__dirname, '../prisma/exam.db'));

  // Ensure category exists
  let catRow = sqliteDb.prepare('SELECT id FROM Category WHERE slug = ?').get(categorySlug);
  let categoryId;
  if (!catRow) {
    categoryId = crypto.randomUUID();
    sqliteDb.prepare(`
      INSERT INTO Category (id, slug, name, code, description, subjectCount, createdAt, updatedAt)
      VALUES (?, ?, ?, 'ACC', 'Accounting & Financial Management', 1, ?, ?)
    `).run(categoryId, categorySlug, categoryName, now, now);
  } else {
    categoryId = catRow.id;
  }

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
        ?, ?, ?, ?, ?, NULL, 150, 150,
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
        name = ?, categoryId = ?, subjectId = ?, totalQuestions = 150,
        durationMinutes = 150, description = ?, isPublic = 1, updatedAt = ?
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
      NULL, 'ገቢ ሰብሳቢ ሠራተኛ I', ?, 'PUBLISHED', ?, NULL,
      NULL, '[0,1,2,3]', ?, ?
    )
  `);

  const preparedQuestions = [];
  for (const q of allQuestions) {
    const qId = crypto.randomUUID();
    const optJson = JSON.stringify(q.options);
    const ansJson = JSON.stringify([q.correctIndex]);
    const tagsJson = JSON.stringify([q.section, "ገቢ ሰብሳቢ ሠራተኛ I", "accounting"]);
    const explanation = `Correct answer is option ${q.correctLetter}: ${q.options[q.correctIndex]}`;

    insertQStmt.run(
      qId, qId, q.text, categoryId, subjectId,
      optJson, ansJson, explanation, tagsJson,
      authorId, now, now, now
    );

    preparedQuestions.push({
      id: qId,
      displayNum: q.displayNum,
      section: q.section,
      text: q.text,
      options: optJson,
      correct: ansJson,
      correctLetter: q.correctLetter,
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
    const pgCatRes = await pool.query('SELECT id FROM "Category" WHERE slug = $1', [categorySlug]);
    const pgCategoryId = pgCatRes.rows.length > 0 ? pgCatRes.rows[0].id : categoryId;

    const pgSubRes = await pool.query('SELECT id FROM "Subject" WHERE slug = $1', [subjectSlug]);
    let pgSubjectId = subjectId;
    if (pgSubRes.rows.length === 0) {
      await pool.query(`
        INSERT INTO "Subject" (id, slug, name, "categoryId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [pgSubjectId, subjectSlug, subjectName, pgCategoryId, now, now]);
      console.log(`Created Subject '${subjectName}' in Supabase`);
    } else {
      pgSubjectId = pgSubRes.rows[0].id;
      await pool.query(`
        UPDATE "Subject" SET "categoryId" = $1, name = $2, "updatedAt" = $3 WHERE id = $4
      `, [pgCategoryId, subjectName, now, pgSubjectId]);
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
          $1, $2, $3, $4, $5, NULL, 150, 150,
          1, false, NULL, true,
          true, false, false, true,
          70, $6, true, $7, $8, $9
        )
      `, [pgExamId, examSlug, examName, pgCategoryId, pgSubjectId, examDesc, now, now, now]);
      console.log(`Created ExamTemplate '${examName}' in Supabase`);
    } else {
      pgExamId = pgExamRes.rows[0].id;
      await pool.query(`
        UPDATE "ExamTemplate" SET
          name = $1, "categoryId" = $2, "subjectId" = $3, "totalQuestions" = 150,
          "durationMinutes" = 150, description = $4, "isPublic" = true, "updatedAt" = $5
        WHERE id = $6
      `, [examName, pgCategoryId, pgSubjectId, examDesc, now, pgExamId]);
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
          NULL, 'ገቢ ሰብሳቢ ሠራተኛ I', $10, 'PUBLISHED', $11, NULL,
          NULL, '[0,1,2,3]', $12, $13
        )
      `, [
        q.id, q.id, q.text, pgCategoryId, pgSubjectId,
        q.options, q.correct, q.explanation, q.tags,
        authorId, now, now, now
      ]);
    }
    console.log(`Successfully inserted ${preparedQuestions.length} questions into Supabase PostgreSQL.`);
  } finally {
    await pool.end();
  }

  // 3. Write files to accounting folder
  const accountingDir = path.resolve(__dirname, '../../accounting');
  if (!fs.existsSync(accountingDir)) {
    fs.mkdirSync(accountingDir, { recursive: true });
  }

  // Markdown file
  let md = `# ገቢ ሰብሳቢ ሠራተኛ I — Examination\n\n`;
  md += `**Category:** Accounting\n`;
  md += `**Subject:** ገቢ ሰብሳቢ ሠራተኛ I\n`;
  md += `**Total Questions:** 150 (100 Technical + 50 Behavioral/Situational)\n`;
  md += `**Duration:** 150 minutes\n\n`;
  md += `---\n\n`;

  md += `## PART I & II — TECHNICAL QUESTIONS (101–200)\n\n`;
  for (const q of rawTechnical) {
    md += `### ${q.num}. ${q.text}\n\n`;
    ['A', 'B', 'C', 'D'].forEach((l, i) => {
      md += `${l}. ${q.options[i]}\n`;
    });
    md += `\n`;
  }

  md += `\n---\n\n## PART III — 50 BEHAVIORAL AND SITUATIONAL-JUDGMENT QUESTIONS (B1–B50)\n\n`;
  for (const q of rawBehavioral) {
    md += `### ${q.id}. ${q.text}\n\n`;
    ['A', 'B', 'C', 'D'].forEach((l, i) => {
      md += `${l}. ${q.options[i]}\n`;
    });
    md += `\n`;
  }

  md += `\n---\n\n## PART IV — ANSWER KEYS\n\n`;
  md += `### Technical Questions 101–200\n\n`;
  for (let i = 101; i <= 200; i++) {
    md += `Q${i}: ${answersKey[i]}\n`;
  }

  md += `\n### Behavioral Questions B1–B50\n\n`;
  for (let i = 1; i <= 50; i++) {
    md += `B${i}: ${answersKey['B' + i]}\n`;
  }

  const mdPath = path.join(accountingDir, 'gebi-sebsabi-seretenya-I.md');
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`Written ${mdPath}`);

  // JSON export
  const jsonExport = {
    examName: "ገቢ ሰብሳቢ ሠራተኛ I",
    category: "Accounting",
    totalQuestions: 150,
    durationMinutes: 150,
    technicalQuestions: rawTechnical.map(q => ({
      num: q.num,
      text: q.text,
      options: q.options,
      correctAnswer: answersKey[q.num],
      correctIndex: letterToIndex[answersKey[q.num]]
    })),
    behavioralQuestions: rawBehavioral.map(q => ({
      id: q.id,
      text: q.text,
      options: q.options,
      correctAnswer: answersKey[q.id],
      correctIndex: letterToIndex[answersKey[q.id]]
    }))
  };

  const jsonPath = path.join(accountingDir, 'gebi-sebsabi-seretenya-I.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonExport, null, 2), 'utf8');
  console.log(`Written ${jsonPath}`);

  console.log("\nAll operations for ገቢ ሰብሳቢ ሠራተኛ I completed successfully!");
}

run().catch((err) => {
  console.error("Error during seeding:", err);
  process.exit(1);
});
