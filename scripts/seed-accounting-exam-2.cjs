const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');

const answersKey = {
  1: 'B', 2: 'C', 3: 'A', 4: 'D', 5: 'A', 6: 'B', 7: 'B', 8: 'C', 9: 'A', 10: 'D',
  11: 'B', 12: 'C', 13: 'A', 14: 'D', 15: 'B', 16: 'C', 17: 'D', 18: 'A', 19: 'B', 20: 'C',
  21: 'C', 22: 'A', 23: 'C', 24: 'B', 25: 'D', 26: 'A', 27: 'C', 28: 'B', 29: 'D', 30: 'C',
  31: 'A', 32: 'B', 33: 'B', 34: 'C', 35: 'D', 36: 'A', 37: 'C', 38: 'B', 39: 'D', 40: 'A',
  41: 'C', 42: 'B', 43: 'D', 44: 'A', 45: 'C', 46: 'B', 47: 'D', 48: 'A', 49: 'C', 50: 'B',
  51: 'D', 52: 'A', 53: 'C', 54: 'B', 55: 'D', 56: 'A', 57: 'C', 58: 'B', 59: 'D', 60: 'A',
  61: 'C', 62: 'B', 63: 'D', 64: 'A', 65: 'C', 66: 'B', 67: 'D', 68: 'A', 69: 'C', 70: 'B',
  71: 'D', 72: 'A', 73: 'C', 74: 'B', 75: 'D', 76: 'A', 77: 'C', 78: 'B', 79: 'D', 80: 'A',
  81: 'C', 82: 'B', 83: 'D', 84: 'A', 85: 'C', 86: 'B', 87: 'D', 88: 'A', 89: 'C', 90: 'B',
  91: 'C', 92: 'B', 93: 'D', 94: 'C', 95: 'A', 96: 'D', 97: 'B', 98: 'C', 99: 'D', 100: 'D'
};

const rawQuestionsData = [
  // Section A: Accounting principles and financial records (1–20)
  {
    num: 1,
    section: "Section A: Accounting principles and financial records",
    text: "An accountant discovers that a supplier invoice for ETB 85,000 was recorded twice in the accounts payable ledger. What is the most appropriate corrective action?",
    options: [
      "Delete both entries and wait for a new invoice.",
      "Record a correcting entry supported by documentation and preserve the audit trail.",
      "Debit cash and credit accounts payable.",
      "Ignore the duplicate until the annual audit."
    ]
  },
  {
    num: 2,
    section: "Section A: Accounting principles and financial records",
    text: "A transaction is recorded in the general journal but omitted from the general ledger. Which accounting process has failed?",
    options: [
      "Bank reconciliation.",
      "Financial statement analysis.",
      "Posting.",
      "Cash budgeting."
    ]
  },
  {
    num: 3,
    section: "Section A: Accounting principles and financial records",
    text: "The trial balance shows total debits of ETB 1,250,000 and total credits of ETB 1,230,000. What is the most appropriate first action?",
    options: [
      "Investigate the ETB 20,000 difference and trace the entries.",
      "Record ETB 20,000 as miscellaneous income.",
      "Reduce the cash balance by ETB 20,000.",
      "Prepare financial statements using the unadjusted figures."
    ]
  },
  {
    num: 4,
    section: "Section A: Accounting principles and financial records",
    text: "An institution receives ETB 300,000 in advance for services to be provided next year. Under accrual accounting, how should the receipt initially be recorded?",
    options: [
      "Debit revenue and credit cash.",
      "Debit accounts receivable and credit revenue.",
      "Debit expense and credit cash.",
      "Debit cash and credit unearned revenue."
    ]
  },
  {
    num: 5,
    section: "Section A: Accounting principles and financial records",
    text: "Equipment costing ETB 600,000 has a useful life of five years and a residual value of ETB 100,000. Using straight-line depreciation, what is the annual depreciation expense?",
    options: [
      "ETB 100,000.",
      "ETB 120,000.",
      "ETB 140,000.",
      "ETB 500,000."
    ]
  },
  {
    num: 6,
    section: "Section A: Accounting principles and financial records",
    text: "A payment of ETB 72,000 for a one-year insurance policy is made on October 1. Assuming a December 31 year-end and monthly allocation, what is the insurance expense for the first three months?",
    options: [
      "ETB 72,000.",
      "ETB 18,000.",
      "ETB 9,000.",
      "ETB 6,000."
    ]
  },
  {
    num: 7,
    section: "Section A: Accounting principles and financial records",
    text: "A company provides services worth ETB 150,000 on credit. Which journal entry is correct at the time the service is provided?",
    options: [
      "Debit cash; credit service revenue.",
      "Debit accounts receivable; credit service revenue.",
      "Debit service revenue; credit accounts receivable.",
      "Debit accounts payable; credit service revenue."
    ]
  },
  {
    num: 8,
    section: "Section A: Accounting principles and financial records",
    text: "Which error can exist even when a trial balance agrees?",
    options: [
      "Posting a debit without a corresponding credit.",
      "Recording a debit of ETB 10,000 and a credit of ETB 8,000.",
      "Omitting an entire transaction from the accounting records.",
      "Posting only the debit side of a transaction."
    ]
  },
  {
    num: 9,
    section: "Section A: Accounting principles and financial records",
    text: "An institution pays ETB 40,000 for office supplies. At year-end, ETB 12,000 of the supplies remain unused. Assuming the payment was initially recorded as an expense, which adjustment is appropriate?",
    options: [
      "Debit supplies inventory ETB 12,000; credit supplies expense ETB 12,000.",
      "Debit supplies expense ETB 12,000; credit cash ETB 12,000.",
      "Debit cash ETB 28,000; credit supplies expense ETB 28,000.",
      "Debit accounts payable ETB 12,000; credit supplies inventory ETB 12,000."
    ]
  },
  {
    num: 10,
    section: "Section A: Accounting principles and financial records",
    text: "Which statement best describes the purpose of a subsidiary ledger?",
    options: [
      "It replaces the general ledger.",
      "It records only cash transactions.",
      "It eliminates the need for a trial balance.",
      "It provides detailed account information supporting a control account in the general ledger."
    ]
  },
  {
    num: 11,
    section: "Section A: Accounting principles and financial records",
    text: "An institution has accounts receivable of ETB 500,000 and estimates that 4% will be uncollectible. What is the required allowance balance if no allowance currently exists?",
    options: [
      "ETB 4,000.",
      "ETB 20,000.",
      "ETB 125,000.",
      "ETB 480,000."
    ]
  },
  {
    num: 12,
    section: "Section A: Accounting principles and financial records",
    text: "A previously written-off receivable of ETB 15,000 is unexpectedly collected. Under the conventional allowance-method approach, what is the appropriate treatment?",
    options: [
      "Record the collection directly as new revenue without further entries.",
      "Debit cash and credit sales revenue only.",
      "Reinstate the receivable and then record the cash collection.",
      "Ignore the receipt because the account was written off."
    ]
  },
  {
    num: 13,
    section: "Section A: Accounting principles and financial records",
    text: "Which account normally carries a debit balance?",
    options: [
      "Accounts receivable.",
      "Accounts payable.",
      "Accumulated depreciation.",
      "Unearned revenue."
    ]
  },
  {
    num: 14,
    section: "Section A: Accounting principles and financial records",
    text: "A purchase of equipment is incorrectly recorded as office expense. Assuming the amount is material and the equipment meets the capitalization criteria, what is the principal effect?",
    options: [
      "Assets and profit are overstated.",
      "Liabilities and profit are overstated.",
      "Cash is overstated.",
      "Assets and current-period profit are understated."
    ]
  },
  {
    num: 15,
    section: "Section A: Accounting principles and financial records",
    text: "Which principle requires expenses to be recognized in the period in which the related economic benefits are consumed, rather than simply when cash is paid?",
    options: [
      "Historical cost only.",
      "Accrual accounting.",
      "Separate entity principle.",
      "Monetary unit assumption."
    ]
  },
  {
    num: 16,
    section: "Section A: Accounting principles and financial records",
    text: "An invoice for ETB 90,000 relates to services received in December, but it is paid in January. What should an accrual-basis accountant generally do at December 31?",
    options: [
      "Record nothing until payment.",
      "Record a prepaid expense.",
      "Recognize the expense and a corresponding payable.",
      "Record revenue and a receivable."
    ]
  },
  {
    num: 17,
    section: "Section A: Accounting principles and financial records",
    text: "The accounts payable control account shows ETB 420,000, while the supplier subsidiary ledger totals ETB 400,000. What should the accountant do first?",
    options: [
      "Reduce the control account to ETB 400,000 immediately.",
      "Increase every supplier balance proportionately.",
      "Transfer the difference to miscellaneous income.",
      "Reconcile the individual supplier balances and trace posting errors."
    ]
  },
  {
    num: 18,
    section: "Section A: Accounting principles and financial records",
    text: "Which transaction increases both total assets and total liabilities?",
    options: [
      "Purchasing supplies on credit.",
      "Paying an outstanding supplier invoice.",
      "Collecting cash from a customer who already owed the institution.",
      "Recording depreciation expense."
    ]
  },
  {
    num: 19,
    section: "Section A: Accounting principles and financial records",
    text: "An institution pays an outstanding liability of ETB 25,000 in cash. What is the effect on the accounting equation?",
    options: [
      "Assets increase and liabilities increase.",
      "Assets decrease and liabilities decrease by the same amount.",
      "Assets decrease and equity increases.",
      "Liabilities decrease and equity increases."
    ]
  },
  {
    num: 20,
    section: "Section A: Accounting principles and financial records",
    text: "Which record ordinarily provides the starting point for preparing a trial balance?",
    options: [
      "Bank statement.",
      "Purchase order register.",
      "General ledger.",
      "Payroll attendance sheet."
    ]
  },

  // Section B: Bank reconciliation and cash management (21–35)
  {
    num: 21,
    section: "Section B: Bank reconciliation and cash management",
    text: "The cash book shows a balance of ETB 180,000. Outstanding checks total ETB 25,000, and deposits in transit total ETB 40,000. Assuming no other differences, what is the adjusted bank statement balance if the unadjusted bank statement balance is ETB 165,000?",
    options: [
      "ETB 150,000.",
      "ETB 180,000.",
      "ETB 190,000.",
      "ETB 210,000."
    ]
  },
  {
    num: 22,
    section: "Section B: Bank reconciliation and cash management",
    text: "A bank statement includes ETB 2,500 in bank service charges not recorded in the cash book. What is the appropriate cash-book adjustment?",
    options: [
      "Debit bank charges expense and credit cash.",
      "Debit cash and credit bank charges expense.",
      "Debit accounts payable and credit cash.",
      "Debit bank charges expense and credit accounts payable."
    ]
  },
  {
    num: 23,
    section: "Section B: Bank reconciliation and cash management",
    text: "A customer deposits ETB 35,000 directly into the institution's bank account, but the accountant has not recorded the transaction. What is the appropriate entry?",
    options: [
      "Debit accounts payable; credit cash.",
      "Debit bank charges; credit revenue.",
      "Debit cash at bank; credit the appropriate receivable or revenue account.",
      "Debit revenue; credit cash at bank."
    ]
  },
  {
    num: 24,
    section: "Section B: Bank reconciliation and cash management",
    text: "A check issued for ETB 18,000 is mistakenly recorded in the cash book as ETB 81,000. Assuming the payment was correctly processed by the bank, how should the cash-book error be corrected?",
    options: [
      "Reduce cash by another ETB 63,000.",
      "Increase the cash-book balance by ETB 63,000.",
      "Make no adjustment because the bank processed the check.",
      "Increase accounts payable by ETB 81,000."
    ]
  },
  {
    num: 25,
    section: "Section B: Bank reconciliation and cash management",
    text: "Which item ordinarily requires adjustment to the cash book rather than simply appearing as a reconciling item on the bank statement side?",
    options: [
      "Deposit in transit.",
      "Outstanding check.",
      "Bank error that has not been corrected by the bank.",
      "Bank interest credited but not yet recorded in the cash book."
    ]
  },
  {
    num: 26,
    section: "Section B: Bank reconciliation and cash management",
    text: "A bank reconciliation reveals a difference that remains unexplained after comparing the bank statement, cash book, and outstanding items. What is the best next step?",
    options: [
      "Investigate the difference and obtain supporting evidence before finalizing the reconciliation.",
      "Force the reconciliation to agree by recording miscellaneous income.",
      "Carry the difference forward indefinitely without explanation.",
      "Change the bank statement balance in the accounting records."
    ]
  },
  {
    num: 27,
    section: "Section B: Bank reconciliation and cash management",
    text: "The bank statement shows ETB 250,000. Outstanding checks are ETB 30,000, and deposits in transit are ETB 20,000. What is the adjusted bank balance?",
    options: [
      "ETB 200,000.",
      "ETB 220,000.",
      "ETB 240,000.",
      "ETB 300,000."
    ]
  },
  {
    num: 28,
    section: "Section B: Bank reconciliation and cash management",
    text: "Which control most directly reduces the risk of unauthorized cash disbursements?",
    options: [
      "Allowing one employee to approve, record, and release every payment.",
      "Separating payment authorization, payment processing, and reconciliation responsibilities.",
      "Eliminating supporting documents for small payments.",
      "Reconciling bank accounts only at year-end."
    ]
  },
  {
    num: 29,
    section: "Section B: Bank reconciliation and cash management",
    text: "A cash-flow forecast predicts a shortage of cash in the coming month despite a positive annual budget. What does this most directly indicate?",
    options: [
      "The annual budget must always be incorrect.",
      "The institution has no liabilities.",
      "Profit necessarily equals cash available.",
      "The timing of cash receipts and payments may create a liquidity problem."
    ]
  },
  {
    num: 30,
    section: "Section B: Bank reconciliation and cash management",
    text: "Why should an institution monitor whether collected revenue is deposited promptly into its bank account?",
    options: [
      "To eliminate the need for revenue records.",
      "To ensure that all revenue is classified as capital expenditure.",
      "To reduce the risk of loss, misappropriation, and delayed recording.",
      "To increase the number of outstanding checks."
    ]
  },
  {
    num: 31,
    section: "Section B: Bank reconciliation and cash management",
    text: "A bank mistakenly debits the institution's account for another customer's payment. What should the accountant do?",
    options: [
      "Notify the bank, document the error, and track its correction; do not treat it as a legitimate institutional expense.",
      "Record the amount as an institutional expense permanently.",
      "Debit accounts receivable and credit revenue.",
      "Ignore the error because it originated with the bank."
    ]
  },
  {
    num: 32,
    section: "Section B: Bank reconciliation and cash management",
    text: "The cash book balance is ETB 95,000. The bank charges ETB 1,000 and credits interest of ETB 2,500, neither recorded in the cash book. What is the adjusted cash-book balance?",
    options: [
      "ETB 91,500.",
      "ETB 96,500.",
      "ETB 97,500.",
      "ETB 98,500."
    ]
  },
  {
    num: 33,
    section: "Section B: Bank reconciliation and cash management",
    text: "Which is the strongest evidence that a bank reconciliation has been properly reviewed?",
    options: [
      "The preparer states verbally that the figures are correct.",
      "A signed or electronically documented review, with investigated differences and supporting evidence.",
      "The closing balance is copied from the previous month.",
      "The reconciliation contains no explanations because no questions were asked."
    ]
  },
  {
    num: 34,
    section: "Section B: Bank reconciliation and cash management",
    text: "Why should bank reconciliations be prepared monthly, as specified in the job description?",
    options: [
      "To guarantee that fraud cannot occur.",
      "To replace all cash receipts and payment records.",
      "To identify timing differences, recording errors, and potentially unauthorized transactions promptly.",
      "To eliminate the need for a general ledger."
    ]
  },
  {
    num: 35,
    section: "Section B: Bank reconciliation and cash management",
    text: "A deposit appears on the bank statement but not in the institution's cash book. Which explanation should be investigated first?",
    options: [
      "It must be an outstanding check.",
      "It necessarily represents an accounting loss.",
      "It must be depreciation.",
      "It may be a direct customer deposit, bank credit, or an unrecorded receipt."
    ]
  },

  // Section C: Accounts receivable, accounts payable, and adjustments (36–50)
  {
    num: 36,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "An institution's accounts receivable include ETB 60,000 outstanding for 18 months. The debtor disputes the amount. What is the most appropriate response?",
    options: [
      "Investigate the dispute, verify supporting records, and assess collectability before proposing any adjustment.",
      "Automatically write off the entire amount without approval.",
      "Recognize an additional ETB 60,000 in revenue.",
      "Transfer the amount to accounts payable."
    ]
  },
  {
    num: 37,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "An invoice for ETB 120,000 is entered as ETB 102,000 in the supplier ledger. What is the difference requiring investigation?",
    options: [
      "ETB 8,000.",
      "ETB 12,000.",
      "ETB 18,000.",
      "ETB 22,000."
    ]
  },
  {
    num: 38,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "Which document most directly supports the amount owed to a supplier for goods received?",
    options: [
      "Employee leave request.",
      "Supplier invoice, matched where applicable with the purchase order and goods-received evidence.",
      "Bank reconciliation alone.",
      "Annual cash-flow forecast alone."
    ]
  },
  {
    num: 39,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "A supplier is paid twice for the same invoice. What is the best immediate accounting and control response?",
    options: [
      "Record both payments as legitimate expenses without review.",
      "Delete the second bank transaction from the cash book.",
      "Offset the duplicate payment against unrelated revenue without documentation.",
      "Verify the duplicate, record the resulting recoverable amount appropriately, and pursue recovery."
    ]
  },
  {
    num: 40,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "Which statement best describes an accounts receivable aging report?",
    options: [
      "It classifies outstanding receivables by the length of time they have remained unpaid.",
      "It records only cash already received.",
      "It calculates depreciation on fixed assets.",
      "It lists only invoices that have been paid."
    ]
  },
  {
    num: 41,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "An organization owes ETB 240,000 to a supplier. It pays ETB 90,000. What is the remaining payable, assuming no other transactions?",
    options: [
      "ETB 330,000.",
      "ETB 240,000.",
      "ETB 150,000.",
      "ETB 90,000."
    ]
  },
  {
    num: 42,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "Which situation is the clearest example of an accrued expense?",
    options: [
      "Cash received for services to be provided next year.",
      "Electricity consumed in December but invoiced in January.",
      "Insurance paid for a future coverage period.",
      "Equipment purchased and paid for immediately."
    ]
  },
  {
    num: 43,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "A receivable is confirmed to be uncollectible, and an adequate allowance has already been established. Under the allowance method, which entry generally writes it off?",
    options: [
      "Debit bad debt expense; credit cash.",
      "Debit cash; credit accounts receivable.",
      "Debit accounts payable; credit accounts receivable.",
      "Debit allowance for doubtful accounts; credit accounts receivable."
    ]
  },
  {
    num: 44,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "What is the principal purpose of an accounts payable aging report?",
    options: [
      "To identify overdue obligations and support payment planning and liability monitoring.",
      "To calculate the market value of fixed assets.",
      "To replace supplier invoices.",
      "To calculate employee attendance."
    ]
  },
  {
    num: 45,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "An institution receives a supplier invoice for goods that were never delivered. What is the best course of action?",
    options: [
      "Pay immediately to avoid delaying the payment report.",
      "Record the amount as a valid expense without further review.",
      "Withhold payment pending verification and resolve the discrepancy through the authorized process.",
      "Delete all records relating to the supplier."
    ]
  },
  {
    num: 46,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "An accountant discovers that a payable was recorded in the wrong supplier's subsidiary account, but the total accounts payable control balance is correct. What is the principal problem?",
    options: [
      "Total liabilities must be overstated.",
      "Individual supplier balances are inaccurate even though the control total agrees.",
      "Cash must be understated.",
      "Revenue must be overstated."
    ]
  },
  {
    num: 47,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "Which practice best supports reliable receivables management?",
    options: [
      "Recording only the amounts that management expects to collect.",
      "Deleting disputed invoices from the records.",
      "Waiting until year-end to review every debtor.",
      "Maintaining customer-level records, aging balances, and documenting collection efforts and disputes."
    ]
  },
  {
    num: 48,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "An accountant finds a liability that was omitted from the previous reporting period. The amount is material. What should happen next?",
    options: [
      "Assess the nature and period of the error, consult applicable accounting policies, and make the authorized correction with appropriate disclosure where required.",
      "Record it as revenue in the current period.",
      "Ignore it because the previous period has ended.",
      "Change the prior-period bank statement."
    ]
  },
  {
    num: 49,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "Which action best prevents payments from being made against fictitious supplier invoices?",
    options: [
      "Allowing suppliers to approve their own payments.",
      "Paying every invoice before checking it.",
      "Independently verifying suppliers and matching invoices with authorized purchases and receipt evidence.",
      "Eliminating approval limits."
    ]
  },
  {
    num: 50,
    section: "Section C: Accounts receivable, accounts payable, and adjustments",
    text: "Why must uncollectible receivables be analyzed and reported rather than simply ignored?",
    options: [
      "Because all receivables must remain collectible forever.",
      "Because collectability affects asset valuation, financial reporting, and management decisions.",
      "Because uncollectible amounts are always revenue.",
      "Because reporting eliminates the need for supporting evidence."
    ]
  },

  // Section D: Payroll, payment authorization, and budget control (51–65)
  {
    num: 51,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "An employee's payroll lists a gross salary of ETB 30,000, deductions of ETB 4,500, and net pay of ETB 25,500. Which statement is correct?",
    options: [
      "Net pay is ETB 34,500.",
      "Gross salary is ETB 25,500.",
      "Deductions must be added to net pay to determine gross salary.",
      "Net pay equals gross salary less deductions."
    ]
  },
  {
    num: 52,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "Payroll shows an employee who left the institution two months ago. What is the best action?",
    options: [
      "Verify employment status and payroll authorization, then correct any improper payment through the approved process.",
      "Pay the employee automatically because the name appears on the payroll.",
      "Delete the entire payroll file.",
      "Transfer the employee's salary to another employee."
    ]
  },
  {
    num: 53,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "Which control is most effective in reducing the risk of fictitious employees on payroll?",
    options: [
      "Allowing one person to create employees and approve salary payments without review.",
      "Paying all salaries in cash without receipts.",
      "Independently verifying employee records and separating HR changes from payroll preparation and approval.",
      "Removing employee identification information from payroll records."
    ]
  },
  {
    num: 54,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "An employee's gross monthly salary is ETB 28,000. Total deductions are ETB 3,800. What is the net salary?",
    options: [
      "ETB 31,800.",
      "ETB 24,200.",
      "ETB 28,000.",
      "ETB 3,800."
    ]
  },
  {
    num: 55,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "A payment request is supported by a valid invoice but lacks evidence that the goods were received. What should the Accountant III do?",
    options: [
      "Approve it because the invoice exists.",
      "Pay half without authorization.",
      "Record it as a bank charge.",
      "Obtain and verify the missing receipt evidence or other authorized confirmation before processing the payment."
    ]
  },
  {
    num: 56,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "According to the job description, under what condition may the Accountant III approve payments?",
    options: [
      "When formally delegated authority by the head of the institution.",
      "Whenever the supplier requests immediate payment.",
      "Whenever cash is available.",
      "Whenever a colleague verbally recommends payment."
    ]
  },
  {
    num: 57,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "A project has sufficient total funding, but a proposed payment is not permitted under the applicable funding agreement. What is the correct response?",
    options: [
      "Pay it because the project has enough cash.",
      "Charge it to another project without documentation.",
      "Hold the payment and verify whether the expenditure is allowable under the agreement and applicable rules.",
      "Classify it as salary expenditure."
    ]
  },
  {
    num: 58,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "What is the principal purpose of a payment authorization document?",
    options: [
      "To replace the institution's annual budget.",
      "To document and authorize a payment after the necessary verification and approvals.",
      "To prove that a supplier has already deposited money.",
      "To eliminate the need for an accounting entry."
    ]
  },
  {
    num: 59,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "A budget line has ETB 500,000 available. A proposed payment is ETB 530,000. What is the immediate budget-control concern?",
    options: [
      "The budget has a surplus of ETB 30,000.",
      "The payment automatically qualifies as a capital asset.",
      "The proposed payment reduces expenditure by ETB 30,000.",
      "The proposed payment exceeds the available budget allocation by ETB 30,000."
    ]
  },
  {
    num: 60,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "Which practice most effectively reduces the risk of unauthorized payroll changes?",
    options: [
      "Restricting access, requiring documented authorization, and maintaining a reviewable record of changes.",
      "Sharing payroll passwords among all employees.",
      "Permitting changes without supporting documentation.",
      "Removing approval requirements during busy months."
    ]
  },
  {
    num: 61,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "A salary payment is made twice to the same employee. What is the most appropriate response?",
    options: [
      "Hide the second payment from the payroll report.",
      "Record both payments as normal salaries without investigation.",
      "Confirm the duplicate, document the overpayment, and pursue recovery and correction through authorized procedures.",
      "Reduce the employee's gross salary permanently without notice."
    ]
  },
  {
    num: 62,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "Why should payroll be verified before salary payments are released?",
    options: [
      "To make every employee's salary equal.",
      "To detect errors in employee eligibility, salary rates, deductions, and net pay before funds are disbursed.",
      "To eliminate all statutory deductions.",
      "To avoid keeping payroll records."
    ]
  },
  {
    num: 63,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "A supplier requests payment to a new bank account by email shortly before a large payment is due. What should the accountant do?",
    options: [
      "Update the account immediately based on the email.",
      "Ask the supplier to send the same email again and then pay.",
      "Ignore the institution's supplier verification process.",
      "Independently verify the change through an established, trusted contact and obtain required authorization."
    ]
  },
  {
    num: 64,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "Which information is most important for assessing whether a proposed expenditure can be charged to a project?",
    options: [
      "The expenditure's purpose, budget availability, eligibility under funding rules, supporting documents, and required approvals.",
      "The supplier's preferred payment date only.",
      "The remaining cash balance only.",
      "The employee who submitted the invoice only."
    ]
  },
  {
    num: 65,
    section: "Section D: Payroll, payment authorization, and budget control",
    text: "An institution's annual budget is balanced, but several monthly payroll obligations cannot be paid on time. Which analysis is most relevant?",
    options: [
      "Depreciation analysis alone.",
      "The number of supplier names in the ledger.",
      "Cash-flow forecasting, expected receipt dates, and the timing of obligations.",
      "The physical inventory of office furniture only."
    ]
  },

  // Section E: Financial reporting, analysis, and compliance (66–80)
  {
    num: 66,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "What is the primary purpose of a trial balance?",
    options: [
      "To prove that all transactions are valid and free from fraud.",
      "To list ledger account balances and check whether total debits equal total credits.",
      "To replace all source documents.",
      "To determine the institution's bank interest rate."
    ]
  },
  {
    num: 67,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "An institution's trial balance agrees, but a cash receipt was recorded as ETB 45,000 instead of ETB 54,000 on both sides of the entry. What is the result?",
    options: [
      "The trial balance must show a ETB 9,000 difference.",
      "The cash account must be overstated by ETB 54,000.",
      "Total liabilities must be understated by ETB 9,000.",
      "The trial balance can still agree despite the ETB 9,000 error."
    ]
  },
  {
    num: 68,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "Which sequence best represents the normal processing of an accounting transaction?",
    options: [
      "Source document, journal entry, ledger posting, trial balance, adjustments, financial reporting.",
      "Financial report, payment, source document, journal entry.",
      "Trial balance, bank statement, invoice, source document.",
      "Ledger posting, cash forecast, invoice creation, budget approval."
    ]
  },
  {
    num: 69,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "A monthly report is due, but the bank reconciliation contains a material unexplained difference. What is the most appropriate action?",
    options: [
      "Conceal the difference to meet the deadline.",
      "Record an unsupported adjustment to force agreement.",
      "Investigate the difference promptly, document its status, and escalate unresolved material issues before finalizing the report.",
      "Delete the bank reconciliation from the reporting package."
    ]
  },
  {
    num: 70,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "Which financial analysis most directly compares actual expenditure with the approved budget?",
    options: [
      "Accounts receivable aging.",
      "Budget-versus-actual variance analysis.",
      "Fixed-asset depreciation analysis only.",
      "Bank deposit slip analysis only."
    ]
  },
  {
    num: 71,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "Actual expenditure is ETB 720,000 against a budget of ETB 800,000. What is the expenditure variance relative to budget?",
    options: [
      "ETB 80,000 unfavorable.",
      "ETB 720,000 favorable.",
      "ETB 800,000 unfavorable.",
      "ETB 80,000 favorable, before considering whether the lower expenditure reflects delayed or incomplete activity."
    ]
  },
  {
    num: 72,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "An institution's cash balance increases significantly, but its accounts payable also increase sharply. What is the best conclusion?",
    options: [
      "The cash increase alone does not prove improved financial health; the increase in unpaid obligations must also be investigated.",
      "The institution necessarily has no financial risks.",
      "The institution's expenses must be zero.",
      "All accounts payable should be recognized as revenue."
    ]
  },
  {
    num: 73,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "What is the purpose of classifying transactions by regular budget, project, and program?",
    options: [
      "To eliminate separate financial reporting.",
      "To make all expenditures interchangeable.",
      "To support tracking, accountability, and financial reporting for different funding sources and activities.",
      "To avoid reconciling accounts."
    ]
  },
  {
    num: 74,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "Which characteristic most improves the reliability of a financial report?",
    options: [
      "Estimates without supporting assumptions.",
      "Accurate, complete, consistent, timely, and verifiable information.",
      "Omission of unfavorable results.",
      "Use of unexplained balancing figures."
    ]
  },
  {
    num: 75,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "Why should an accountant retain supporting documents for journal entries and adjustments?",
    options: [
      "To avoid having to explain accounting decisions.",
      "To make it impossible to review the transactions.",
      "To replace the general ledger.",
      "To establish the basis for the entry and support verification, audit, and accountability."
    ]
  },
  {
    num: 76,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "Revenue collected under an institution's legal authority is deposited into the bank but not entered into the accounting system. Which risk is most directly created?",
    options: [
      "Incomplete revenue records and potentially inaccurate financial reports.",
      "Automatic overstatement of depreciation.",
      "Automatic understatement of payroll deductions.",
      "Elimination of the need for bank reconciliation."
    ]
  },
  {
    num: 77,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "What is the best way to improve a financial analysis format that repeatedly causes errors?",
    options: [
      "Remove all calculations from the format.",
      "Allow each employee to use undocumented formulas.",
      "Review the format, standardize fields and formulas, test changes, and obtain appropriate approval.",
      "Replace all financial records with verbal reports."
    ]
  },
  {
    num: 78,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "Which report would most directly help management estimate whether sufficient funds will be available to meet upcoming payments?",
    options: [
      "Fixed-asset register only.",
      "Cash-flow forecast.",
      "Supplier address list.",
      "Employee attendance register."
    ]
  },
  {
    num: 79,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "An accountant identifies an apparent breach of financial procedures. What should be the most appropriate response?",
    options: [
      "Ignore it if the amount is small.",
      "Publicly accuse the employee before reviewing the evidence.",
      "Change the records to remove any sign of the breach.",
      "Preserve relevant evidence, verify the facts, and report through the appropriate institutional channels."
    ]
  },
  {
    num: 80,
    section: "Section E: Financial reporting, analysis, and compliance",
    text: "Which practice best supports compliance with financial laws and directives?",
    options: [
      "Applying current, relevant rules; documenting approvals; and escalating transactions that cannot be verified as compliant.",
      "Following verbal instructions even when they conflict with mandatory controls.",
      "Using the same payment procedure for every transaction regardless of applicable restrictions.",
      "Approving transactions first and checking their legality only after an audit."
    ]
  },

  // Section F: Internal controls, ethics, and difficult workplace scenarios (81–90)
  {
    num: 81,
    section: "Section F: Internal controls, ethics, and difficult workplace scenarios",
    text: "The employee who prepares payments also reconciles the bank account and approves the transactions. What is the principal control weakness?",
    options: [
      "Excessive documentation.",
      "Too many independent reviewers.",
      "Inadequate segregation of duties, increasing the risk of error and fraud.",
      "Excessive transparency."
    ]
  },
  {
    num: 82,
    section: "Section F: Internal controls, ethics, and difficult workplace scenarios",
    text: "A supervisor pressures the Accountant III to approve a payment without adequate supporting documents. What is the most appropriate response?",
    options: [
      "Approve it to preserve the working relationship.",
      "Explain the documentation requirements, request the missing evidence, and escalate the matter if necessary.",
      "Create false supporting documents.",
      "Process the payment outside the accounting system."
    ]
  },
  {
    num: 83,
    section: "Section F: Internal controls, ethics, and difficult workplace scenarios",
    text: "A supplier offers the accountant a personal gift in exchange for prioritizing its invoice. What should the accountant do?",
    options: [
      "Accept the gift if the invoice amount is correct.",
      "Accept it but keep it confidential.",
      "Delay other suppliers' payments without explanation.",
      "Decline the improper benefit and follow the institution's ethics and reporting procedures."
    ]
  },
  {
    num: 84,
    section: "Section F: Internal controls, ethics, and difficult workplace scenarios",
    text: "An employee discovers a material accounting error made by a colleague. What is the best professional response?",
    options: [
      "Verify the facts, preserve documentation, and arrange an authorized correction without concealing the error.",
      "Delete the colleague's entries without approval.",
      "Blame the colleague publicly before investigating.",
      "Leave the error uncorrected because another person made it."
    ]
  },
  {
    num: 85,
    section: "Section F: Internal controls, ethics, and difficult workplace scenarios",
    text: "An institution's management asks for an earlier financial report to be changed so that actual expenditure appears lower. What should the accountant do?",
    options: [
      "Change the figures if management requests it.",
      "Remove the original report and all supporting records.",
      "Refuse to falsify the report, retain the audit trail, and use authorized correction and escalation procedures.",
      "Transfer the excess expenditure to an unrelated account without evidence."
    ]
  },
  {
    num: 86,
    section: "Section F: Internal controls, ethics, and difficult workplace scenarios",
    text: "Which control is most effective for preventing unauthorized changes to financial records?",
    options: [
      "Shared user accounts with administrator access for everyone.",
      "Role-based access, authentication, change logs, and independent review.",
      "Removing all approval records.",
      "Allowing edits without recording who made them."
    ]
  },
  {
    num: 87,
    section: "Section F: Internal controls, ethics, and difficult workplace scenarios",
    text: "A payment is correctly calculated but exceeds the accountant's delegated approval authority. What should happen?",
    options: [
      "The accountant should approve it because the calculation is correct.",
      "The payment should be split artificially to avoid approval limits.",
      "The supplier should decide who approves it.",
      "The payment should be referred to the properly authorized official."
    ]
  },
  {
    num: 88,
    section: "Section F: Internal controls, ethics, and difficult workplace scenarios",
    text: "A bank reconciliation has been prepared correctly, but there is no evidence of review. What is the main weakness?",
    options: [
      "There is no documented evidence that an independent review occurred.",
      "The cash book must be incorrect.",
      "The bank statement is invalid.",
      "All outstanding checks must be fraudulent."
    ]
  },
  {
    num: 89,
    section: "Section F: Internal controls, ethics, and difficult workplace scenarios",
    text: "A colleague requests another employee's payroll information without a legitimate work-related reason. What is the appropriate response?",
    options: [
      "Share the information because all employees work for the same institution.",
      "Post the information in a group chat.",
      "Protect the information and follow applicable access and disclosure rules.",
      "Send the full payroll file to a personal email account."
    ]
  },
  {
    num: 90,
    section: "Section F: Internal controls, ethics, and difficult workplace scenarios",
    text: "A service user becomes angry because a payment is delayed while the accountant checks compliance. What is the best professional response?",
    options: [
      "Release the payment immediately to end the disagreement.",
      "Explain the applicable requirements calmly, identify outstanding issues, and communicate the next steps.",
      "Refuse all further communication.",
      "Alter the records to make the payment appear compliant."
    ]
  },

  // Section G: Advanced calculations and integrated case studies (91–100)
  {
    num: 91,
    section: "Section G: Advanced calculations and integrated case studies",
    text: "An institution has opening accounts receivable of ETB 200,000. Credit revenue is ETB 650,000, cash collections from customers are ETB 580,000, and approved write-offs are ETB 20,000. Assuming no other changes, what is the closing gross accounts receivable balance?",
    options: [
      "ETB 230,000.",
      "ETB 250,000.",
      "ETB 270,000.",
      "ETB 850,000."
    ]
  },
  {
    num: 92,
    section: "Section G: Advanced calculations and integrated case studies",
    text: "A project budget is ETB 2,400,000. Eligible expenditure recorded to date is ETB 1,680,000, and outstanding approved commitments not yet recorded as expenditure total ETB 300,000. How much budget remains uncommitted, assuming all figures refer to the same budget period and commitments are distinct from recorded expenditure?",
    options: [
      "ETB 720,000.",
      "ETB 420,000.",
      "ETB 300,000.",
      "ETB 1,020,000."
    ]
  },
  {
    num: 93,
    section: "Section G: Advanced calculations and integrated case studies",
    text: "Equipment costs ETB 900,000, has a residual value of ETB 100,000, and a useful life of four years. Under straight-line depreciation, what is the carrying amount at the end of the second full year, assuming no impairment or other adjustments?",
    options: [
      "ETB 900,000.",
      "ETB 800,000.",
      "ETB 400,000.",
      "ETB 500,000."
    ]
  },
  {
    num: 94,
    section: "Section G: Advanced calculations and integrated case studies",
    text: "An institution's unadjusted cash-book balance is ETB 310,000. The bank has charged ETB 4,000 in fees and credited ETB 6,000 in interest not yet recorded in the books. What is the adjusted cash-book balance?",
    options: [
      "ETB 300,000.",
      "ETB 310,000.",
      "ETB 312,000.",
      "ETB 320,000."
    ]
  },
  {
    num: 95,
    section: "Section G: Advanced calculations and integrated case studies",
    text: "A supplier invoice is ETB 240,000 before a trade discount of 10%. What is the invoice amount after the discount, before any other charges or taxes?",
    options: [
      "ETB 216,000.",
      "ETB 224,000.",
      "ETB 240,000.",
      "ETB 264,000."
    ]
  },
  {
    num: 96,
    section: "Section G: Advanced calculations and integrated case studies",
    text: "An institution's total eligible project budget is ETB 1,500,000. Actual eligible expenditure is ETB 1,050,000. What percentage of the budget has been utilized?",
    options: [
      "30%.",
      "45%.",
      "60%.",
      "70%."
    ]
  },
  {
    num: 97,
    section: "Section G: Advanced calculations and integrated case studies",
    text: "A payment request for ETB 450,000 is submitted. The invoice supports ETB 450,000, but the goods-received note confirms delivery worth only ETB 400,000. No other evidence supports the remaining ETB 50,000. What is the best action?",
    options: [
      "Approve ETB 450,000 because the invoice is signed.",
      "Verify the discrepancy and withhold the unsupported portion until receipt or other authorized evidence is established.",
      "Pay ETB 400,000 and destroy the invoice.",
      "Record ETB 50,000 as revenue."
    ]
  },
  {
    num: 98,
    section: "Section G: Advanced calculations and integrated case studies",
    text: "The trial balance agrees, but the accountant discovers that a capital asset costing ETB 200,000 was recorded as an expense. The asset should have been capitalized. What is the most appropriate response?",
    options: [
      "Make no adjustment because the trial balance agrees.",
      "Increase accounts payable by ETB 200,000 regardless of the payment status.",
      "Correct the classification through an authorized adjusting entry and assess the depreciation and reporting effects.",
      "Record ETB 200,000 as additional revenue."
    ]
  },
  {
    num: 99,
    section: "Section G: Advanced calculations and integrated case studies",
    text: "A bank reconciliation shows a book balance of ETB 500,000. An unrecorded bank fee is ETB 5,000, and a direct customer deposit not yet recorded in the books is ETB 35,000. What is the adjusted cash-book balance, assuming no other book adjustments?",
    options: [
      "ETB 460,000.",
      "ETB 495,000.",
      "ETB 500,000.",
      "ETB 530,000."
    ]
  },
  {
    num: 100,
    section: "Section G: Advanced calculations and integrated case studies",
    text: "The Accountant III is preparing a high-value payment for a grant-funded project. The invoice is valid, but the accountant finds that the expense classification is inconsistent with the grant agreement, the supplier balance does not match the subsidiary ledger, and the bank reconciliation has an unexplained difference. What is the best overall course of action?",
    options: [
      "Release the payment because the invoice is valid and investigate the other issues later.",
      "Change the account classifications until the trial balance agrees.",
      "Transfer the payment to the regular budget without authorization.",
      "Investigate and resolve the discrepancies, verify grant eligibility and supporting documentation, prepare authorized corrections, and obtain the required approval before payment."
    ]
  }
];

const letterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };

async function run() {
  console.log(`Starting seed for Accounting Exam II (${rawQuestionsData.length} questions)...`);
  if (rawQuestionsData.length !== 100) {
    throw new Error(`Expected 100 questions, got ${rawQuestionsData.length}`);
  }

  // Verify all questions have valid answers
  for (const q of rawQuestionsData) {
    const letter = answersKey[q.num];
    if (!letter || letterToIndex[letter] === undefined) {
      throw new Error(`Invalid answer key for question ${q.num}: ${letter}`);
    }
    if (q.options.length !== 4) {
      throw new Error(`Question ${q.num} does not have 4 options`);
    }
  }

  const now = new Date().toISOString();
  const authorId = 'e6a0cc7f-1d9c-45ed-8139-457031b71f3c'; // Admin

  const categorySlug = 'accounting';
  const categoryName = 'Accounting';
  const categoryDesc = 'Accounting principles, financial records, bank reconciliation, receivables, payables, payroll, and controls.';

  const subjectSlug = 'account-exam-ii';
  const subjectName = 'Accountant III exam';

  const examSlug = 'account-exam-ii';
  const examName = 'Accountant III exam';
  const examDesc = 'Comprehensive 100-question examination covering Accounting principles and financial records, Bank reconciliation and cash management, Receivables & Payables adjustments, Payroll & budget control, Financial reporting & compliance, Internal controls & ethics, and Advanced calculations.';

  // 1. SQLite update
  const sqliteDb = new DatabaseSync(path.resolve(__dirname, '../prisma/exam.db'));

  // Ensure Category exists
  let catRow = sqliteDb.prepare('SELECT id FROM Category WHERE slug = ?').get(categorySlug);
  let categoryId;
  if (!catRow) {
    categoryId = crypto.randomUUID();
    sqliteDb.prepare(`
      INSERT INTO Category (id, slug, name, code, description, subjectCount, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(categoryId, categorySlug, categoryName, 'ACC', categoryDesc, now, now);
    console.log(`Created Category '${categoryName}' in SQLite with id ${categoryId}`);
  } else {
    categoryId = catRow.id;
    console.log(`Category '${categoryName}' already exists in SQLite with id ${categoryId}`);
  }

  // Ensure Subject exists
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
    // update category if needed
    sqliteDb.prepare('UPDATE Subject SET categoryId = ?, name = ? WHERE id = ?').run(categoryId, subjectName, subjectId);
    console.log(`Subject '${subjectName}' already exists in SQLite with id ${subjectId}`);
  }

  // Ensure ExamTemplate exists
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

  // Delete existing questions for this subject in SQLite to allow re-seeding
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
      NULL, 'Account Exam II', ?, 'PUBLISHED', ?, NULL,
      NULL, '[0,1,2,3]', ?, ?
    )
  `);

  const preparedQuestions = [];
  for (const q of rawQuestionsData) {
    const qId = crypto.randomUUID();
    const optJson = JSON.stringify(q.options);
    const correctLetter = answersKey[q.num];
    const correctIdx = letterToIndex[correctLetter];
    const ansJson = JSON.stringify([correctIdx]);
    const tagsJson = JSON.stringify([q.section, "accounting", "exam-ii"]);
    const explanation = `Correct answer is option ${correctLetter}: ${q.options[correctIdx]}`;

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
      correctLetter,
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
    // Ensure Category in Supabase
    const pgCatRes = await pool.query('SELECT id FROM "Category" WHERE slug = $1', [categorySlug]);
    let pgCategoryId = categoryId;
    if (pgCatRes.rows.length === 0) {
      await pool.query(`
        INSERT INTO "Category" (id, slug, name, code, description, "subjectCount", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, 1, $6, $7)
      `, [pgCategoryId, categorySlug, categoryName, 'ACC', categoryDesc, now, now]);
      console.log(`Created Category '${categoryName}' in Supabase`);
    } else {
      pgCategoryId = pgCatRes.rows[0].id;
      console.log(`Category '${categoryName}' already in Supabase with id ${pgCategoryId}`);
    }

    // Ensure Subject in Supabase
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
      console.log(`Subject '${subjectName}' already in Supabase with id ${pgSubjectId}`);
    }

    // Ensure ExamTemplate in Supabase
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
      `, [pgExamId, examSlug, examName, pgCategoryId, pgSubjectId, examDesc, now, now, now]);
      console.log(`Created ExamTemplate '${examName}' in Supabase`);
    } else {
      pgExamId = pgExamRes.rows[0].id;
      await pool.query(`
        UPDATE "ExamTemplate" SET
          name = $1, "categoryId" = $2, "subjectId" = $3, "totalQuestions" = 100,
          "durationMinutes" = 120, description = $4, "isPublic" = true, "updatedAt" = $5
        WHERE id = $6
      `, [examName, pgCategoryId, pgSubjectId, examDesc, now, pgExamId]);
      console.log(`Updated ExamTemplate '${examName}' in Supabase`);
    }

    // Delete existing questions for this subject in Supabase
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
          NULL, 'Account Exam II', $10, 'PUBLISHED', $11, NULL,
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

  // 3. Write structured files into the user's workspace accounting folder
  const accountingDir = path.resolve(__dirname, '../../accounting');
  if (!fs.existsSync(accountingDir)) {
    fs.mkdirSync(accountingDir, { recursive: true });
    console.log(`Created accounting directory: ${accountingDir}`);
  }

  // Write account-exam-II.md
  let mdContent = `# Account Exam II\n\n`;
  mdContent += `**Category:** Accounting\n`;
  mdContent += `**Subject:** Account Exam II\n`;
  mdContent += `**Total Questions:** 100\n`;
  mdContent += `**Duration:** 120 minutes\n\n`;
  mdContent += `---\n\n`;

  let currentSection = "";
  for (const q of rawQuestionsData) {
    if (q.section !== currentSection) {
      currentSection = q.section;
      mdContent += `\n## ${currentSection}\n\n`;
    }
    mdContent += `### ${q.num}. ${q.text}\n\n`;
    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, idx) => {
      mdContent += `${letters[idx]}. ${opt}\n`;
    });
    mdContent += `\n`;
  }

  mdContent += `\n---\n\n## Answer Key — All 100 Answers\n\n`;
  const sections = [
    { name: "Section A: Questions 1–20", start: 1, end: 20 },
    { name: "Section B: Questions 21–35", start: 21, end: 35 },
    { name: "Section C: Questions 36–50", start: 36, end: 50 },
    { name: "Section D: Questions 51–65", start: 51, end: 65 },
    { name: "Section E: Questions 66–80", start: 66, end: 80 },
    { name: "Section F: Questions 81–90", start: 81, end: 90 },
    { name: "Section G: Questions 91–100", start: 91, end: 100 },
  ];

  for (const s of sections) {
    mdContent += `### ${s.name}\n`;
    for (let i = s.start; i <= s.end; i++) {
      mdContent += `Q${i}: ${answersKey[i]}\n`;
    }
    mdContent += `\n`;
  }

  fs.writeFileSync(path.join(accountingDir, 'account-exam-II.md'), mdContent, 'utf8');
  console.log(`Written ${path.join(accountingDir, 'account-exam-II.md')}`);

  // Write account-exam-II.json
  const jsonExport = {
    examName: "Account Exam II",
    category: "Accounting",
    totalQuestions: 100,
    durationMinutes: 120,
    passThresholdPercent: 70,
    questions: rawQuestionsData.map(q => ({
      num: q.num,
      section: q.section,
      question: q.text,
      options: q.options,
      correctAnswer: answersKey[q.num],
      correctIndex: letterToIndex[answersKey[q.num]]
    }))
  };
  fs.writeFileSync(path.join(accountingDir, 'account-exam-II.json'), JSON.stringify(jsonExport, null, 2), 'utf8');
  console.log(`Written ${path.join(accountingDir, 'account-exam-II.json')}`);

  console.log("\nAll operations completed successfully!");
}

run().catch((err) => {
  console.error("Error during seeding:", err);
  process.exit(1);
});
