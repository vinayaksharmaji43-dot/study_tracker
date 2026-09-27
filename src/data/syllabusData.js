// Comprehensive Syllabus Data for CA Foundation, CA Intermediate, CMA Foundation, and CMA Intermediate

export const SYLLABUS_DATA = {
  CA: {
    Foundation: [
      {
        subject: 'Accounting',
        chapters: [
          { id: 'ca_fnd_acc_1', title: 'Chapter 1: Theoretical Framework' },
          { id: 'ca_fnd_acc_2', title: 'Chapter 2: Accounting Process' },
          { id: 'ca_fnd_acc_3', title: 'Chapter 3: Bank Reconciliation Statement' },
          { id: 'ca_fnd_acc_4', title: 'Chapter 4: Inventories' },
          { id: 'ca_fnd_acc_5', title: 'Chapter 5: Depreciation and Amortisation' },
          { id: 'ca_fnd_acc_6', title: 'Chapter 6: Bills of Exchange and Promissory Notes' },
          { id: 'ca_fnd_acc_7', title: 'Chapter 7: Final Accounts of Sole Proprietors' },
          { id: 'ca_fnd_acc_8', title: 'Chapter 8: Financial Statements of Not-for-Profit Organizations' },
          { id: 'ca_fnd_acc_9', title: 'Chapter 9: Accounting from Incomplete Records' },
          { id: 'ca_fnd_acc_10', title: 'Chapter 10: Partnership and LLP Accounts' },
          { id: 'ca_fnd_acc_11', title: 'Chapter 11: Company Accounts' },
        ]
      },
      {
        subject: 'Business Law',
        chapters: [
          { id: 'ca_fnd_law_1', title: 'Chapter 1: Indian Regulatory Framework' },
          { id: 'ca_fnd_law_2', title: 'Chapter 2: The Indian Contract Act, 1872' },
          { id: 'ca_fnd_law_3', title: 'Chapter 3: The Sale of Goods Act, 1930' },
          { id: 'ca_fnd_law_4', title: 'Chapter 4: The Limited Liability Partnership Act, 2008' },
          { id: 'ca_fnd_law_5', title: 'Chapter 5: The Companies Act, 2013' },
          { id: 'ca_fnd_law_6', title: 'Chapter 6: The Negotiable Instruments Act, 1881' },
        ]
      },
      {
        subject: 'Business Economics',
        chapters: [
          { id: 'ca_fnd_eco_1', title: 'Chapter 1: Introduction to Business Economics' },
          { id: 'ca_fnd_eco_2', title: 'Chapter 2: Theory of Demand and Supply' },
          { id: 'ca_fnd_eco_3', title: 'Chapter 3: Theory of Production and Cost' },
          { id: 'ca_fnd_eco_4', title: 'Chapter 4: Price Determination in Different Markets' },
          { id: 'ca_fnd_eco_5', title: 'Chapter 5: Determination of National Income' },
          { id: 'ca_fnd_eco_6', title: 'Chapter 6: Business Cycles' },
          { id: 'ca_fnd_eco_7', title: 'Chapter 7: Public Finance' },
          { id: 'ca_fnd_eco_8', title: 'Chapter 8: Money Market' },
          { id: 'ca_fnd_eco_9', title: 'Chapter 9: International Trade' },
          { id: 'ca_fnd_eco_10', title: 'Chapter 10: Indian Economy' },
        ]
      },
      {
        subject: 'Quantitative Aptitude',
        chapters: [
          { id: 'ca_fnd_qa_1', title: 'Chapter 1: Ratio and Proportion, Indices and Logarithms' },
          { id: 'ca_fnd_qa_2', title: 'Chapter 2: Equations' },
          { id: 'ca_fnd_qa_3', title: 'Chapter 3: Linear Inequalities with Objective Functions and Optimization' },
          { id: 'ca_fnd_qa_4', title: 'Chapter 4: Mathematics of Finance' },
          { id: 'ca_fnd_qa_5', title: 'Chapter 5: Permutations and Combinations' },
          { id: 'ca_fnd_qa_6', title: 'Chapter 6: Sequence and Series' },
          { id: 'ca_fnd_qa_7', title: 'Chapter 7: Sets, Relations and Functions' },
          { id: 'ca_fnd_qa_8', title: 'Chapter 8: Basic Applications of Differential and Integral Calculus' },
        ]
      }
    ],
    Intermediate: [
      {
        subject: 'Paper 1 — Advanced Accounting',
        chapters: [
          { id: 'ca_int_p1_ch1', title: 'Chapter 1: Introduction to Accounting Standards' },
          { id: 'ca_int_p1_ch2', title: 'Chapter 2: Framework for Preparation and Presentation of Financial Statements' },
          { id: 'ca_int_p1_ch3', title: 'Chapter 3: Applicability of Accounting Standards' },
          { id: 'ca_int_p1_ch4', title: 'Chapter 4: Presentation & Disclosures Based Accounting Standards' },
          { id: 'ca_int_p1_ch5', title: 'Chapter 5: Assets-Based Accounting Standards (AS 2, 10, 13, 16, 19, 26, 28)' },
          { id: 'ca_int_p1_ch6', title: 'Chapter 6: Liabilities-Based Accounting Standards (AS 15, 29)' },
          { id: 'ca_int_p1_ch7', title: 'Chapter 7: Accounting Standards Based on Items Impacting Financial Statements (AS 4, 5, 11, 22)' },
          { id: 'ca_int_p1_ch8', title: 'Chapter 8: Revenue-Based Accounting Standards (AS 7, 9)' },
          { id: 'ca_int_p1_ch9', title: 'Chapter 9: Other Accounting Standards (AS 12)' },
          { id: 'ca_int_p1_ch10', title: 'Chapter 10: Accounting Standards for Consolidated Financial Statements (AS 21, 23, 27)' },
          { id: 'ca_int_p1_ch11', title: 'Chapter 11: Financial Statements of Companies' },
          { id: 'ca_int_p1_ch12', title: 'Chapter 12: Buyback of Securities' },
          { id: 'ca_int_p1_ch13', title: 'Chapter 13: Amalgamation of Companies' },
          { id: 'ca_int_p1_ch14', title: 'Chapter 14: Accounting for Reconstruction of Companies (Internal Reconstruction)' },
          { id: 'ca_int_p1_ch15', title: 'Chapter 15: Accounting for Branches including Foreign Branches' },
        ]
      },
      {
        subject: 'Paper 2 — Corporate and Other Laws',
        chapters: [
          {
            id: 'ca_int_p2_ch1',
            chapterNo: 1,
            title: 'Chapter 1: Preliminary',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Introduction, Meaning and Characteristics of a Company', description: 'Meaning and characteristics of a company', points: 10, isActive: true },
              { id: 'ca_int_p2_ch1_u2', unitNo: 'Unit 2', order: 2, title: 'Types of Companies', description: 'Classification and types of companies', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch2',
            chapterNo: 2,
            title: 'Chapter 2: Incorporation of Company and Matters Incidental Thereto',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Legal Position, Incorporation Procedure and Promoters', description: 'Incorporation procedure, promoters and legal position', points: 10, isActive: true },
              { id: 'ca_int_p2_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Memorandum of Association (MoA) and Articles of Association (AoA)', description: 'MoA and AoA clauses and alteration', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch3',
            chapterNo: 3,
            title: 'Chapter 3: Prospectus and Allotment of Securities',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch3_u1', unitNo: 'Unit 1', order: 1, title: 'Issue of Prospectus', description: 'Provisions for issue of prospectus', points: 10, isActive: true },
              { id: 'ca_int_p2_ch3_u2', unitNo: 'Unit 2', order: 2, title: 'Allotment of Securities and Private Placement', description: 'Allotment procedure and private placement rules', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch4',
            chapterNo: 4,
            title: 'Chapter 4: Share Capital and Debentures',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch4_u1', unitNo: 'Unit 1', order: 1, title: 'Nature and Types of Share Capital & Transferability', description: 'Nature and types of share capital, transfer and transmission', points: 10, isActive: true },
              { id: 'ca_int_p2_ch4_u2', unitNo: 'Unit 2', order: 2, title: 'Alteration and Reduction of Share Capital, Buy-Back', description: 'Alteration, reduction of share capital and buy-back provisions', points: 10, isActive: true },
              { id: 'ca_int_p2_ch4_u3', unitNo: 'Unit 3', order: 3, title: 'Issue and Redemption of Debentures', description: 'Debenture issue rules and redemption requirements', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch5',
            chapterNo: 5,
            title: 'Chapter 5: Acceptance of Deposits by Companies',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch5_u1', unitNo: 'Unit 1', order: 1, title: 'Provisions relating to Acceptance of Deposits from Members and Public', description: 'Acceptance of deposits rules from members and public', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch6',
            chapterNo: 6,
            title: 'Chapter 6: Registration of Charges',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch6_u1', unitNo: 'Unit 1', order: 1, title: 'Creation, Registration, Modification and Satisfaction of Charges', description: 'Registration, modification and satisfaction of charges', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch7',
            chapterNo: 7,
            title: 'Chapter 7: Management & Administration',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch7_u1', unitNo: 'Unit 1', order: 1, title: 'Registers and Returns', description: 'Maintenance of statutory registers and annual returns', points: 10, isActive: true },
              { id: 'ca_int_p2_ch7_u2', unitNo: 'Unit 2', order: 2, title: 'Meetings (AGM, EGM, Voting, Resolutions and Minutes)', description: 'General meetings, voting, resolutions and minutes', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch8',
            chapterNo: 8,
            title: 'Chapter 8: Declaration and Payment of Dividend',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch8_u1', unitNo: 'Unit 1', order: 1, title: 'Provisions regarding Declaration, Payment and Unpaid Dividend', description: 'Declaration, payment and unpaid dividend transfer rules', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch9',
            chapterNo: 9,
            title: 'Chapter 9: Accounts of Companies',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch9_u1', unitNo: 'Unit 1', order: 1, title: 'Maintenance of Books of Accounts and Financial Statements', description: 'Books of accounts, financial statements and board report', points: 10, isActive: true },
              { id: 'ca_int_p2_ch9_u2', unitNo: 'Unit 2', order: 2, title: 'Corporate Social Responsibility (CSR)', description: 'CSR applicability, committee and expenditure rules', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch10',
            chapterNo: 10,
            title: 'Chapter 10: Audit and Auditors',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch10_u1', unitNo: 'Unit 1', order: 1, title: 'Appointment, Resignation and Removal of Auditors', description: 'Auditor appointment, rotation, resignation and removal', points: 10, isActive: true },
              { id: 'ca_int_p2_ch10_u2', unitNo: 'Unit 2', order: 2, title: 'Powers, Duties, Liabilities and Standards of Auditors', description: 'Auditor powers, duties, reporting and penalties', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch11',
            chapterNo: 11,
            title: 'Chapter 11: Companies Incorporated Outside India',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch11_u1', unitNo: 'Unit 1', order: 1, title: 'Provisions relating to Foreign Companies', description: 'Provisions relating to foreign companies in India', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch12',
            chapterNo: 12,
            title: 'Chapter 12: Limited Liability Partnership Act, 2008',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch12_u1', unitNo: 'Unit 1', order: 1, title: 'Nature, Incorporation of LLP, Partners and their Relations', description: 'LLP characteristics, incorporation and partner relations', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch13',
            chapterNo: 13,
            title: 'Chapter 13: The General Clauses Act, 1897',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch13_u1', unitNo: 'Unit 1', order: 1, title: 'Central Acts, Interpretations and General Rules of Construction', description: 'General rules of construction and central act definitions', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch14',
            chapterNo: 14,
            title: 'Chapter 14: Interpretation of Statutes',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch14_u1', unitNo: 'Unit 1', order: 1, title: 'Rules and Aids to Interpretation of Statutes', description: 'Primary and secondary rules and internal/external aids', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p2_ch15',
            chapterNo: 15,
            title: 'Chapter 15: The Foreign Exchange Management Act, 1999 (FEMA)',
            points: 10,
            units: [
              { id: 'ca_int_p2_ch15_u1', unitNo: 'Unit 1', order: 1, title: 'Introduction, Current and Capital Account Transactions', description: 'FEMA overview, current and capital account transactions', points: 10, isActive: true }
            ]
          }
        ]
      },
      {
        subject: 'Paper 3 — Taxation',
        chapters: [
          {
            id: 'ca_int_p3_ch1',
            chapterNo: 1,
            title: 'Chapter 1: Basic Concepts',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Introduction to Income Tax, Rates and Important Definitions', description: 'Income tax concept, tax rates and key definitions', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch2',
            chapterNo: 2,
            title: 'Chapter 2: Residence and Scope of Total Income',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Residential Status of Individuals and Other Persons & Scope of Total Income', description: 'Residential status determination and scope of total income', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch3',
            chapterNo: 3,
            title: 'Chapter 3: Incomes which do not form part of Total Income',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch3_u1', unitNo: 'Unit 1', order: 1, title: 'Exempted Incomes (Section 10)', description: 'Exempt incomes under section 10', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch4',
            chapterNo: 4,
            title: 'Chapter 4: Heads of Income',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch4_u1', unitNo: 'Unit 1', order: 1, title: 'Salaries', description: 'Computation of income under salaries', points: 10, isActive: true },
              { id: 'ca_int_p3_ch4_u2', unitNo: 'Unit 2', order: 2, title: 'Income from House Property', description: 'Annual value determination and deductions', points: 10, isActive: true },
              { id: 'ca_int_p3_ch4_u3', unitNo: 'Unit 3', order: 3, title: 'Profits and Gains of Business or Profession (PGBP)', description: 'PGBP admissibility of expenses and presumptive tax', points: 10, isActive: true },
              { id: 'ca_int_p3_ch4_u4', unitNo: 'Unit 4', order: 4, title: 'Capital Gains', description: 'Short-term and long-term capital gains computation', points: 10, isActive: true },
              { id: 'ca_int_p3_ch4_u5', unitNo: 'Unit 5', order: 5, title: 'Income from Other Sources', description: 'Taxation of dividends, gifts and other incomes', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch5',
            chapterNo: 5,
            title: 'Chapter 5: Income of Other Persons included in Assessee’s Total Income',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch5_u1', unitNo: 'Unit 1', order: 1, title: 'Clubbing of Income', description: 'Clubbing provisions under sections 60 to 64', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch6',
            chapterNo: 6,
            title: 'Chapter 6: Aggregation of Income, Set-off and Carry Forward of Losses',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch6_u1', unitNo: 'Unit 1', order: 1, title: 'Set-off and Carry Forward of Losses', description: 'Inter-source and inter-head set-off and carry forward rules', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch7',
            chapterNo: 7,
            title: 'Chapter 7: Deductions from Gross Total Income',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch7_u1', unitNo: 'Unit 1', order: 1, title: 'Deductions under Chapter VI-A (80C to 80U)', description: 'General and specific deductions under Chapter VI-A', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch8',
            chapterNo: 8,
            title: 'Chapter 8: Advance Tax, Tax Deduction at Source (TDS) and Tax Collection at Source (TCS)',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch8_u1', unitNo: 'Unit 1', order: 1, title: 'Provisions for TDS and TCS', description: 'TDS and TCS rates, thresholds and compliance', points: 10, isActive: true },
              { id: 'ca_int_p3_ch8_u2', unitNo: 'Unit 2', order: 2, title: 'Advance Tax and Interest Payment', description: 'Advance tax instalments and interest under 234A/B/C', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch9',
            chapterNo: 9,
            title: 'Chapter 9: Provisions for filing Return of Income and Self-assessment',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch9_u1', unitNo: 'Unit 1', order: 1, title: 'Return Filing Due Dates, Forms, PAN/Aadhaar and Self-Assessment', description: 'Return filing dates, forms, PAN/Aadhaar and self-assessment', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch10',
            chapterNo: 10,
            title: 'Chapter 10: Income Tax Authorities',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch10_u1', unitNo: 'Unit 1', order: 1, title: 'Hierarchy, Powers and Functions of Tax Authorities', description: 'Income tax hierarchy, powers of search, seizure and assessment', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch11',
            chapterNo: 11,
            title: 'Chapter 11: GST in India - An Introduction',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch11_u1', unitNo: 'Unit 1', order: 1, title: 'Genesis of GST, Concept and Benefits of GST', description: 'GST constitutional framework, dual GST model and benefits', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch12',
            chapterNo: 12,
            title: 'Chapter 12: Supply under GST',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch12_u1', unitNo: 'Unit 1', order: 1, title: 'Concept, Scope and Types of Supply', description: 'Scope of supply, mixed vs composite supply (Section 7 & 8)', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch13',
            chapterNo: 13,
            title: 'Chapter 13: Charge of GST',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch13_u1', unitNo: 'Unit 1', order: 1, title: 'Forward Charge, Reverse Charge Mechanism (RCM) and Composition Scheme', description: 'Forward charge, RCM notifications and composition levy (Section 9 & 10)', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch14',
            chapterNo: 14,
            title: 'Chapter 14: Place of Supply',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch14_u1', unitNo: 'Unit 1', order: 1, title: 'Determination of Place of Supply of Goods and Services', description: 'Place of supply rules for domestic and cross-border transactions', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch15',
            chapterNo: 15,
            title: 'Chapter 15: Exemptions from GST',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch15_u1', unitNo: 'Unit 1', order: 1, title: 'Goods and Services Exempt from Tax', description: 'Exemption list of essential goods and services', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch16',
            chapterNo: 16,
            title: 'Chapter 16: Time of Supply',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch16_u1', unitNo: 'Unit 1', order: 1, title: 'Determination of Time of Supply for Goods and Services', description: 'Time of supply for forward charge, reverse charge and vouchers', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch17',
            chapterNo: 17,
            title: 'Chapter 17: Value of Supply',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch17_u1', unitNo: 'Unit 1', order: 1, title: 'Valuation of Supply Rules', description: 'Transaction value inclusions, exclusions and valuation rules', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch18',
            chapterNo: 18,
            title: 'Chapter 18: Input Tax Credit (ITC)',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch18_u1', unitNo: 'Unit 1', order: 1, title: 'Eligibility, Conditions and Apportionment of Credit', description: 'ITC conditions, blocked credits (Section 17(5)) and reversal', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch19',
            chapterNo: 19,
            title: 'Chapter 19: Registration',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch19_u1', unitNo: 'Unit 1', order: 1, title: 'Persons Liable, Exempt and Procedure for Registration', description: 'Mandatory registration, threshold limits and procedure', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch20',
            chapterNo: 20,
            title: 'Chapter 20: Tax Invoice, Credit and Debit Notes',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch20_u1', unitNo: 'Unit 1', order: 1, title: 'E-way Bill, Invoice Rules and Credit/Debit Notes', description: 'Tax invoice particulars, e-invoicing and e-way bill rules', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch21',
            chapterNo: 21,
            title: 'Chapter 21: Accounts and Records',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch21_u1', unitNo: 'Unit 1', order: 1, title: 'Maintenance of Accounts and Period of Retention', description: 'Books and records maintenance and retention requirements', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch22',
            chapterNo: 22,
            title: 'Chapter 22: Payment of Tax',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch22_u1', unitNo: 'Unit 1', order: 1, title: 'Electronic Ledgers, Interest on Delayed Payment', description: 'Cash ledger, credit ledger, liability register and interest payment', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p3_ch23',
            chapterNo: 23,
            title: 'Chapter 23: Returns',
            points: 10,
            units: [
              { id: 'ca_int_p3_ch23_u1', unitNo: 'Unit 1', order: 1, title: 'Furnishing of Periodic Returns (GSTR-1, GSTR-3B etc.)', description: 'Periodic return filing dates, procedures and annual returns', points: 10, isActive: true }
            ]
          }
        ]
      },
      {
        subject: 'Paper 4 — Cost and Management Accounting',
        chapters: [
          {
            id: 'ca_int_p4_ch1',
            chapterNo: 1,
            title: 'Chapter 1: Introduction to Cost and Management Accounting',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Overview of Cost and Management Accounting, Cost Objects and Classifications', description: 'Cost concepts, cost objects, cost centres and classifications', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch2',
            chapterNo: 2,
            title: 'Chapter 2: Material Cost',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Procurement, Storage and Inventory Control', description: 'EOQ, stock levels, inventory control techniques (ABC, VED)', points: 10, isActive: true },
              { id: 'ca_int_p4_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Material Issue Pricing and Accounting', description: 'FIFO, Weighted Average, scrap, waste and spoilage treatment', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch3',
            chapterNo: 3,
            title: 'Chapter 3: Employee Cost and Direct Expenses',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch3_u1', unitNo: 'Unit 1', order: 1, title: 'Employee Cost Control, Attendance and Payroll Systems', description: 'Time keeping, idle time, overtime and labor turnover', points: 10, isActive: true },
              { id: 'ca_int_p4_ch3_u2', unitNo: 'Unit 2', order: 2, title: 'Remuneration Systems and Incentive Schemes', description: 'Halsey, Rowan and individual/group incentive plans', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch4',
            chapterNo: 4,
            title: 'Chapter 4: Overheads: Production and Service Departments',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch4_u1', unitNo: 'Unit 1', order: 1, title: 'Allocation, Apportionment and Absorption of Overheads', description: 'Primary and secondary distribution, machine hour rate, under/over absorption', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch5',
            chapterNo: 5,
            title: 'Chapter 5: Activity Based Costing (ABC)',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch5_u1', unitNo: 'Unit 1', order: 1, title: 'Activity Cost Pools, Cost Drivers and Product Costing using ABC', description: 'Identification of cost pools, drivers and ABC cost computation', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch6',
            chapterNo: 6,
            title: 'Chapter 6: Cost Sheet',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch6_u1', unitNo: 'Unit 1', order: 1, title: 'Preparation of Cost Sheet for Determination of Total Cost and Profit', description: 'Prime cost, factory cost, cost of production and total cost sheet', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch7',
            chapterNo: 7,
            title: 'Chapter 7: Cost Accounting Systems',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch7_u1', unitNo: 'Unit 1', order: 1, title: 'Integral and Non-Integral Accounting Systems', description: 'Ledgers, cost control accounts and integrated journal entries', points: 10, isActive: true },
              { id: 'ca_int_p4_ch7_u2', unitNo: 'Unit 2', order: 2, title: 'Reconciliation of Cost and Financial Accounts', description: 'Reconciliation statement between cost and financial profit', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch8',
            chapterNo: 8,
            title: 'Chapter 8: Unit and Batch Costing',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch8_u1', unitNo: 'Unit 1', order: 1, title: 'Unit Costing System', description: 'Cost per unit determination in single output industries', points: 10, isActive: true },
              { id: 'ca_int_p4_ch8_u2', unitNo: 'Unit 2', order: 2, title: 'Batch Costing System and Economic Batch Quantity (EBQ)', description: 'Batch cost sheet and EBQ calculation', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch9',
            chapterNo: 9,
            title: 'Chapter 9: Job Costing and Contract Costing',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch9_u1', unitNo: 'Unit 1', order: 1, title: 'Job Costing Features and Accounting', description: 'Job cost cards and tracking of specific order costs', points: 10, isActive: true },
              { id: 'ca_int_p4_ch9_u2', unitNo: 'Unit 2', order: 2, title: 'Contract Costing, Escalation Clause and Work-in-Progress', description: 'Work certified, retention money, escalation clause and profit recognition', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch10',
            chapterNo: 10,
            title: 'Chapter 10: Process and Operation Costing',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch10_u1', unitNo: 'Unit 1', order: 1, title: 'Process Costing Basics and Joint Products & By-Products', description: 'Process accounts, normal/abnormal loss and joint products apportionment', points: 10, isActive: true },
              { id: 'ca_int_p4_ch10_u2', unitNo: 'Unit 2', order: 2, title: 'Equivalent Production and Inter-Process Profits', description: 'Equivalent units computation (FIFO & Weighted Avg) and inter-process profit', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch11',
            chapterNo: 11,
            title: 'Chapter 11: Service Costing',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch11_u1', unitNo: 'Unit 1', order: 1, title: 'Costing of Transport, Hospital, Hotel and IT Services', description: 'Operating cost sheet for passenger/goods transport, hospitals and hotels', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch12',
            chapterNo: 12,
            title: 'Chapter 12: Standard Costing',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch12_u1', unitNo: 'Unit 1', order: 1, title: 'Introduction and Material Variance Analysis', description: 'Standard setting and material cost, price, usage, mix and yield variances', points: 10, isActive: true },
              { id: 'ca_int_p4_ch12_u2', unitNo: 'Unit 2', order: 2, title: 'Labor and Overhead Variance Analysis', description: 'Labor rate, efficiency, idle time variances and variable/fixed overhead variances', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch13',
            chapterNo: 13,
            title: 'Chapter 13: Marginal Costing',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch13_u1', unitNo: 'Unit 1', order: 1, title: 'Cost-Volume-Profit (CVP) Analysis, Breakeven Point and Decision Making', description: 'Contribution, P/V ratio, BEP, margin of safety and short-term decision making', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p4_ch14',
            chapterNo: 14,
            title: 'Chapter 14: Budgetary Control',
            points: 10,
            units: [
              { id: 'ca_int_p4_ch14_u1', unitNo: 'Unit 1', order: 1, title: 'Preparation of Functional, Flexible and Master Budgets', description: 'Production, sales, cash budgets, flexible budgeting and budgetary ratios', points: 10, isActive: true }
            ]
          }
        ]
      },
      {
        subject: 'Paper 5 — Auditing and Ethics',
        chapters: [
          {
            id: 'ca_int_p5_ch1',
            chapterNo: 1,
            title: 'Chapter 1: Nature, Objective and Scope of Audit',
            points: 10,
            units: [
              { id: 'ca_int_p5_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Meaning, Objectives, Scope and Inherent Limitations of Audit', description: 'Auditing definition, reasonable assurance and inherent limitations (SA 200)', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p5_ch2',
            chapterNo: 2,
            title: 'Chapter 2: Audit Strategy, Audit Planning and Audit Programme',
            points: 10,
            units: [
              { id: 'ca_int_p5_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Development of Strategy, Plan and Quality Control for Audit Work', description: 'Audit strategy, planning, materiality (SA 320) and quality control (SQC 1 / SA 220)', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p5_ch3',
            chapterNo: 3,
            title: 'Chapter 3: Risk Assessment and Internal Control',
            points: 10,
            units: [
              { id: 'ca_int_p5_ch3_u1', unitNo: 'Unit 1', order: 1, title: 'Identifying Risks, Internal Control Evaluation and IT Environment', description: 'Risk of material misstatement, internal control testing and IT controls (SA 315)', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p5_ch4',
            chapterNo: 4,
            title: 'Chapter 4: Audit Evidence',
            points: 10,
            units: [
              { id: 'ca_int_p5_ch4_u1', unitNo: 'Unit 1', order: 1, title: 'Audit Procedures, Sources and Reliability of Audit Evidence', description: 'Sufficient appropriate audit evidence, assertions and confirmations (SA 500 & 505)', points: 10, isActive: true },
              { id: 'ca_int_p5_ch4_u2', unitNo: 'Unit 2', order: 2, title: 'Audit Sampling and Analytical Procedures', description: 'Sampling risk, design (SA 530) and substantive analytical procedures (SA 520)', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p5_ch5',
            chapterNo: 5,
            title: 'Chapter 5: Audit of Items of Financial Statements',
            points: 10,
            units: [
              { id: 'ca_int_p5_ch5_u1', unitNo: 'Unit 1', order: 1, title: 'Audit of Assets, Liabilities, Income and Expenses', description: 'Substantive testing of balance sheet and P&L line items', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p5_ch6',
            chapterNo: 6,
            title: 'Chapter 6: Audit Documentation',
            points: 10,
            units: [
              { id: 'ca_int_p5_ch6_u1', unitNo: 'Unit 1', order: 1, title: 'Maintenance of Working Papers, Audit Files and Completion Review', description: 'Audit documentation requirements, assembly and retention (SA 230)', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p5_ch7',
            chapterNo: 7,
            title: 'Chapter 7: Completion and Review',
            points: 10,
            units: [
              { id: 'ca_int_p5_ch7_u1', unitNo: 'Unit 1', order: 1, title: 'Subsequent Events, Going Concern and Management Representations', description: 'Subsequent events (SA 560), going concern (SA 570) and written reps (SA 580)', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p5_ch8',
            chapterNo: 8,
            title: 'Chapter 8: Audit Report',
            points: 10,
            units: [
              { id: 'ca_int_p5_ch8_u1', unitNo: 'Unit 1', order: 1, title: 'Forming an Opinion and Reporting on Financial Statements (SA 700, 705, 706)', description: 'Unmodified/modified opinions, KAM (SA 701), EMP and OMP paragraphs', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p5_ch9',
            chapterNo: 9,
            title: 'Chapter 9: Special Features of Audit of Different Types of Entities',
            points: 10,
            units: [
              { id: 'ca_int_p5_ch9_u1', unitNo: 'Unit 1', order: 1, title: 'Audit of Government, Local Bodies and Non-Profit Organizations (NGOs)', description: 'C&AG powers, local bodies and trust/NGO audit considerations', points: 10, isActive: true },
              { id: 'ca_int_p5_ch9_u2', unitNo: 'Unit 2', order: 2, title: 'Audit of Sole Traders, Firms, Hotels, Clubs and Educational Institutions', description: 'Audit procedures for commercial, educational and hospitality entities', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p5_ch10',
            chapterNo: 10,
            title: 'Chapter 10: Audit of Banks',
            points: 10,
            units: [
              { id: 'ca_int_p5_ch10_u1', unitNo: 'Unit 1', order: 1, title: 'Understanding Bank Operations, Advances and NPA Provisions', description: 'RBI guidelines, bank audit approach, advances classification and NPA provisioning', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p5_ch11',
            chapterNo: 11,
            title: 'Chapter 11: Ethics and Terms of Audit Engagements',
            points: 10,
            units: [
              { id: 'ca_int_p5_ch11_u1', unitNo: 'Unit 1', order: 1, title: 'Professional Ethics, Independence of Auditors and ICAI Code of Ethics', description: 'Fundamental principles, independence threats, safeguards and engagement terms (SA 210)', points: 10, isActive: true }
            ]
          }
        ]
      },
      {
        subject: 'Paper 6 — Financial Management and Strategic Management',
        chapters: [
          {
            id: 'ca_int_p6_ch1',
            chapterNo: 1,
            title: 'Chapter 1: Scope and Objectives of Financial Management',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Role of Finance Manager, Profit vs wealth maximization', description: 'Financial objectives, role of finance manager and agency problem', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch2',
            chapterNo: 2,
            title: 'Chapter 2: Types of Financing',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Long term, Medium term and Short term Sources of Finance', description: 'Equity, debt, venture capital, lease and short-term credit instruments', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch3',
            chapterNo: 3,
            title: 'Chapter 3: Financial Analysis and Planning - Ratio Analysis',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch3_u1', unitNo: 'Unit 1', order: 1, title: 'Profitability, Liquidity, Solvency and Turnover Ratios', description: 'Key financial ratios, DuPont analysis and financial interpretation', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch4',
            chapterNo: 4,
            title: 'Chapter 4: Cost of Capital',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch4_u1', unitNo: 'Unit 1', order: 1, title: 'Cost of Debt, Equity, Preference Shares and WACC', description: 'Component costs of debt, equity, retained earnings and weighted average cost of capital', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch5',
            chapterNo: 5,
            title: 'Chapter 5: Capital Structure',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch5_u1', unitNo: 'Unit 1', order: 1, title: 'Capital Structure Theories and Designing Optimal Structure', description: 'Net income, NOI, traditional and MM theories with EBIT-EPS indifference analysis', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch6',
            chapterNo: 6,
            title: 'Chapter 6: Leverages',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch6_u1', unitNo: 'Unit 1', order: 1, title: 'Operating, Financial and Combined Leverages', description: 'Degree of operating leverage (DOL), financial leverage (DFL) and combined leverage (DCL)', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch7',
            chapterNo: 7,
            title: 'Chapter 7: Investment Decisions (Capital Budgeting)',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch7_u1', unitNo: 'Unit 1', order: 1, title: 'Evaluation Techniques (NPV, IRR, Payback, PI) and Risk Analysis', description: 'Discounted cash flow techniques, NPV vs IRR conflict and sensitivity analysis', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch8',
            chapterNo: 8,
            title: 'Chapter 8: Dividend Decisions',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch8_u1', unitNo: 'Unit 1', order: 1, title: 'Theories of Dividend (Walter, Gordon, MM) and Dividend Policies', description: 'Walter model, Gordon model, MM hypothesis and corporate dividend practices', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch9',
            chapterNo: 9,
            title: 'Chapter 9: Management of Working Capital',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch9_u1', unitNo: 'Unit 1', order: 1, title: 'Cash, Inventory, Receivables and Financing of Working Capital', description: 'Operating cycle estimation, cash budgets, receivable credit policies and Tandon/Chore committee', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch10',
            chapterNo: 10,
            title: 'Chapter 10: Introduction to Strategic Management',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch10_u1', unitNo: 'Unit 1', order: 1, title: 'Concept of Strategy, Importance and Strategic Levels', description: 'Corporate, business and functional strategic levels and strategic intent', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch11',
            chapterNo: 11,
            title: 'Chapter 11: Strategic Analysis: External Environment',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch11_u1', unitNo: 'Unit 1', order: 1, title: 'Pestle Analysis, Porter\'s Five Forces and Industry Analysis', description: 'Macro environmental scanning (PESTLE), competitive forces and strategic groups', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch12',
            chapterNo: 12,
            title: 'Chapter 12: Strategic Analysis: Internal Environment',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch12_u1', unitNo: 'Unit 1', order: 1, title: 'Resource Based View, Value Chain Analysis, SWOT and Portfolio Matrix', description: 'VRIO framework, Porter\'s value chain, SWOT analysis and BCG/Ansoff matrix', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch13',
            chapterNo: 13,
            title: 'Chapter 13: Strategic Choices',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch13_u1', unitNo: 'Unit 1', order: 1, title: 'Business Level Strategies (Cost Leadership, Differentiation) and Corporate Strategies', description: 'Generic competitive strategies, diversification, mergers, acquisitions and retrenchment', points: 10, isActive: true }
            ]
          },
          {
            id: 'ca_int_p6_ch14',
            chapterNo: 14,
            title: 'Chapter 14: Strategy Implementation and Control',
            points: 10,
            units: [
              { id: 'ca_int_p6_ch14_u1', unitNo: 'Unit 1', order: 1, title: 'Organization Structure, Strategic Leadership and Control Systems', description: 'Organizational structures (matrix, network), strategic change management and balanced scorecard', points: 10, isActive: true }
            ]
          }
        ]
      }
    ]
  },
  CMA: {
    Foundation: [
      {
        subject: 'Paper 1 — Fundamentals of Business Laws and Business Communication',
        chapters: [
          { id: 'cma_fnd_p1_ch1', title: 'Chapter 1: Introduction to Law and Legal System in India' },
          { id: 'cma_fnd_p1_ch2', title: 'Chapter 2: Indian Contract Act, 1872' },
          { id: 'cma_fnd_p1_ch3', title: 'Chapter 3: Sale of Goods Act, 1930' },
          { id: 'cma_fnd_p1_ch4', title: 'Chapter 4: Negotiable Instruments Act, 1881' },
          { id: 'cma_fnd_p1_ch5', title: 'Chapter 5: Business Communication' },
          { id: 'cma_fnd_p1_ch6', title: 'Chapter 6: Written Communication & Drafting Commercial Correspondence' },
        ]
      },
      {
        subject: 'Paper 2 — Fundamentals of Financial and Cost Accounting',
        chapters: [
          { id: 'cma_fnd_p2_ch1', title: 'Chapter 1: Accounting Fundamentals' },
          { id: 'cma_fnd_p2_ch2', title: 'Chapter 2: Accounting for Special Transactions' },
          { id: 'cma_fnd_p2_ch3', title: 'Chapter 3: Preparation of Final Accounts' },
          { id: 'cma_fnd_p2_ch4', title: 'Chapter 4: Fundamentals of Cost Accounting' },
        ]
      },
      {
        subject: 'Paper 3 — Fundamentals of Business Mathematics and Statistics',
        chapters: [
          { id: 'cma_fnd_p3_ch1', title: 'Chapter 1: Arithmetic' },
          { id: 'cma_fnd_p3_ch2', title: 'Chapter 2: Algebra' },
          { id: 'cma_fnd_p3_ch3', title: 'Chapter 3: Calculus' },
          { id: 'cma_fnd_p3_ch4', title: 'Chapter 4: Statistical Representation of Data' },
          { id: 'cma_fnd_p3_ch5', title: 'Chapter 5: Measures of Central Tendency and Dispersion' },
          { id: 'cma_fnd_p3_ch6', title: 'Chapter 6: Correlation and Regression' },
          { id: 'cma_fnd_p3_ch7', title: 'Chapter 7: Probability' },
          { id: 'cma_fnd_p3_ch8', title: 'Chapter 8: Index Numbers and Time Series' },
        ]
      },
      {
        subject: 'Paper 4 — Fundamentals of Business Economics and Management',
        chapters: [
          { id: 'cma_fnd_p4_ch1', title: 'Chapter 1: Basic Concepts of Economics' },
          { id: 'cma_fnd_p4_ch2', title: 'Chapter 2: Forms of Market' },
          { id: 'cma_fnd_p4_ch3', title: 'Chapter 3: Money and Banking' },
          { id: 'cma_fnd_p4_ch4', title: 'Chapter 4: Economic and Business Environment' },
          { id: 'cma_fnd_p4_ch5', title: 'Chapter 5: Fundamentals of Management' },
        ]
      }
    ],
    Intermediate: [
      {
        subject: 'Group I — Business Laws and Ethics',
        chapters: [
          { id: 'cma_int_g1_law_1', title: 'Chapter 1: Commercial Laws' },
          { id: 'cma_int_g1_law_2', title: 'Chapter 2: Industrial Laws' },
          { id: 'cma_int_g1_law_3', title: 'Chapter 3: Corporate Laws' },
          { id: 'cma_int_g1_law_4', title: 'Chapter 4: Business Ethics' },
        ]
      },
      {
        subject: 'Group I — Financial Accounting',
        chapters: [
          { id: 'cma_int_g1_fa_1', title: 'Chapter 1: Accounting Fundamentals & Special Transactions' },
          { id: 'cma_int_g1_fa_2', title: 'Chapter 2: Preparation of Financial Statements' },
          { id: 'cma_int_g1_fa_3', title: 'Chapter 3: Partnership Accounts' },
          { id: 'cma_int_g1_fa_4', title: 'Chapter 4: Lease, Branch & Departmental Accounts, Incomplete Records' },
          { id: 'cma_int_g1_fa_5', title: 'Chapter 5: Computerised Accounting Environment & Accounting Standards (AS)' },
        ]
      },
      {
        subject: 'Group I — Direct and Indirect Taxation',
        chapters: [
          { id: 'cma_int_g1_tax_1', title: 'Chapter 1: Direct Taxation — Income Tax Act & Heads of Income' },
          { id: 'cma_int_g1_tax_2', title: 'Chapter 2: Direct Taxation — Clubbing, Deductions & Assessment' },
          { id: 'cma_int_g1_tax_3', title: 'Chapter 3: Indirect Taxation — CGST Act 2017' },
          { id: 'cma_int_g1_tax_4', title: 'Chapter 4: Indirect Taxation — IGST Act 2017 & Customs Act 1962' },
        ]
      },
      {
        subject: 'Group I — Cost Accounting',
        chapters: [
          { id: 'cma_int_g1_ca_1', title: 'Chapter 1: Introduction to Cost Accounting' },
          { id: 'cma_int_g1_ca_2', title: 'Chapter 2: Cost Elements — Material, Employee and Overheads' },
          { id: 'cma_int_g1_ca_3', title: 'Chapter 3: Cost Accounting Standards (CAS) & Cost Book-keeping' },
          { id: 'cma_int_g1_ca_4', title: 'Chapter 4: Methods of Costing' },
          { id: 'cma_int_g1_ca_5', title: 'Chapter 5: Cost Accounting Techniques' },
        ]
      },
      {
        subject: 'Group II — Operations Management and Strategic Management',
        chapters: [
          { id: 'cma_int_g2_om_1', title: 'Chapter 1: Operations Management' },
          { id: 'cma_int_g2_om_2', title: 'Chapter 2: Strategic Management' },
        ]
      },
      {
        subject: 'Group II — Corporate Accounting and Auditing',
        chapters: [
          { id: 'cma_int_g2_caa_1', title: 'Chapter 1: Corporate Accounting' },
          { id: 'cma_int_g2_caa_2', title: 'Chapter 2: Auditing' },
        ]
      },
      {
        subject: 'Group II — Financial Management and Business Data Analytics',
        chapters: [
          { id: 'cma_int_g2_fmbda_1', title: 'Chapter 1: Financial Management' },
          { id: 'cma_int_g2_fmbda_2', title: 'Chapter 2: Business Data Analytics' },
        ]
      },
      {
        subject: 'Group II — Management Accounting',
        chapters: [
          { id: 'cma_int_g2_ma_1', title: 'Chapter 1: Activity-Based Costing (ABC)' },
          { id: 'cma_int_g2_ma_2', title: 'Chapter 2: Marginal Costing & Decision Making' },
          { id: 'cma_int_g2_ma_3', title: 'Chapter 3: Standard Costing & Variance Analysis' },
          { id: 'cma_int_g2_ma_4', title: 'Chapter 4: Budgetary Control & Transfer Pricing' },
          { id: 'cma_int_g2_ma_5', title: 'Chapter 5: Strategic Performance Management' },
        ]
      }
    ]
  }
};

// Helper function to resolve course and level cleanly from profile data
export function getStudentSyllabus(userCourse, userLevel) {
  let courseKey = 'CA';
  let levelKey = 'Foundation';

  if (userCourse === 'CMA' || userCourse?.includes('CMA')) {
    courseKey = 'CMA';
  } else {
    courseKey = 'CA';
  }

  if (userLevel === 'Intermediate' || userCourse?.includes('Intermediate')) {
    levelKey = 'Intermediate';
  } else {
    levelKey = 'Foundation';
  }

  const subjects = SYLLABUS_DATA[courseKey]?.[levelKey] || SYLLABUS_DATA.CA.Foundation;
  
  let totalChaptersCount = 0;
  let totalUnitsCount = 0;
  const allChapterIds = [];

  subjects.forEach(sub => {
    sub.chapters.forEach(ch => {
      totalChaptersCount++;
      allChapterIds.push(ch.id);
      if (ch.units && Array.isArray(ch.units)) {
        totalUnitsCount += ch.units.filter(u => u.isActive !== false).length;
      }
    });
  });

  return {
    courseKey,
    levelKey,
    subjects,
    totalChaptersCount,
    totalUnitsCount,
    allChapterIds
  };
}

// Preset standard units generator according to ICSI / ICAI academic syllabus structure
export function getDefaultUnitsForChapter(streamId, chapterTitle, chapterNo = 1, chapterId = '') {
  const normTitle = (chapterTitle || '').toLowerCase();
  
  // Deterministic baseId - NEVER use Date.now() or random timestamps so unit IDs remain stable across renders
  let baseId = '';
  if (chapterId && typeof chapterId === 'string' && chapterId.trim()) {
    baseId = chapterId.trim();
  } else if (streamId && typeof streamId === 'string' && (
    streamId.startsWith('ch_') || 
    streamId.startsWith('rev_ch_') || 
    streamId.includes('_ch') || 
    streamId.includes('_c') ||
    !['ca_foundation', 'ca_intermediate', 'ca_final', 'cma_foundation', 'cma_intermediate', 'cma_final'].includes(streamId.toLowerCase())
  )) {
    baseId = streamId.trim();
  } else {
    const slug = (chapterTitle || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30);
    baseId = `${streamId || 'ch'}_ch${chapterNo}${slug ? '_' + slug : ''}`;
  }

  // Accounting Theoretical Framework
  if (normTitle.includes('theoretical framework')) {
    return [
      { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Meaning and Scope of Accounting', description: 'Definitions, objective, functions, bookkeeping vs accounting', points: 10, isActive: true },
      { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Accounting Concepts, Principles and Conventions', description: 'Going concern, consistency, accrual, conservatism, materiality', points: 15, isActive: true },
      { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Terms Used in Accounting', description: 'Assets, liabilities, equity, revenues, expenses, valuation principles', points: 10, isActive: true },
      { id: `${baseId}_u4`, unitNo: 'Unit 4', order: 4, title: 'Capital and Revenue Expenditures & Receipts', description: 'Classification of expenditures and receipts with criteria', points: 15, isActive: true },
      { id: `${baseId}_u5`, unitNo: 'Unit 5', order: 5, title: 'Contingent Assets and Contingent Liabilities', description: 'Present obligations, probable outflows and disclosures', points: 10, isActive: true },
      { id: `${baseId}_u6`, unitNo: 'Unit 6', order: 6, title: 'Accounting Policies', description: 'Selection and changes in accounting policies', points: 10, isActive: true },
      { id: `${baseId}_u7`, unitNo: 'Unit 7', order: 7, title: 'Accounting Standards & Ind AS', description: 'Standard setting process, overview of AS and IFRS convergence', points: 15, isActive: true }
    ];
  }

  // Accounting Process
  if (normTitle.includes('accounting process')) {
    return [
      { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Journal Entries & Books of Original Entry', description: 'Double entry system, rules of debit and credit, compound entries', points: 15, isActive: true },
      { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Ledger Posting and Balancing', description: 'Sub-ledgers, personal, real and nominal account balancing', points: 10, isActive: true },
      { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Trial Balance Preparation & Analysis', description: 'Objectives, limitations and methods of preparation', points: 10, isActive: true },
      { id: `${baseId}_u4`, unitNo: 'Unit 4', order: 4, title: 'Subsidiary Books & Triple Column Cash Book', description: 'Purchase book, sales book, petty cash and discounts', points: 15, isActive: true },
      { id: `${baseId}_u5`, unitNo: 'Unit 5', order: 5, title: 'Rectification of Errors', description: 'Errors before & after trial balance, suspense account treatment', points: 20, isActive: true }
    ];
  }

  // Bank Reconciliation Statement
  if (normTitle.includes('bank reconciliation')) {
    return [
      { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Causes of Differences Between Cash Book and Pass Book', description: 'Timing differences, transactions recorded by bank, errors', points: 10, isActive: true },
      { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Preparation of BRS without Adjusted Cash Book', description: 'Starting with favorable/overdraft balances', points: 15, isActive: true },
      { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Preparation of BRS with Adjusted (Amended) Cash Book', description: 'Adjusting errors and omissions before reconciling', points: 20, isActive: true }
    ];
  }

  // Inventories
  if (normTitle.includes('inventories') || normTitle.includes('inventory')) {
    return [
      { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Meaning, Nature and Scope of Inventory Valuation', description: 'Applicability of AS 2 / Ind AS 2, cost elements', points: 10, isActive: true },
      { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Inventory Valuation Methods (FIFO, Weighted Average)', description: 'Periodic vs perpetual inventory recording methods', points: 15, isActive: true },
      { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Net Realisable Value (NRV) & Physical Stock Taking', description: 'Valuation at lower of cost and net realisable value', points: 20, isActive: true }
    ];
  }

  // Depreciation
  if (normTitle.includes('depreciation')) {
    return [
      { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Concepts, Methods (Straight Line & WDV Methods)', description: 'Factors determining depreciation, cost basis, salvage value', points: 15, isActive: true },
      { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Change in Depreciation Method and Useful Life', description: 'Prospective treatment as per revised AS 10', points: 15, isActive: true },
      { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Asset Disposal, Provision for Depreciation & Revaluation', description: 'Accounting for disposal and accumulated depreciation accounts', points: 20, isActive: true }
    ];
  }

  // Bills of Exchange
  if (normTitle.includes('bills of exchange')) {
    return [
      { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Definition, Specimen and Essential Characteristics', description: 'Drawer, drawee, payee, days of grace, maturity date', points: 10, isActive: true },
      { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Accounting for Retaining, Discounting and Endorsement', description: 'Journal entries in drawer and drawee books', points: 15, isActive: true },
      { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Dishonour, Noting Charges and Renewal of Bills', description: 'Treatment of interest and new bill acceptance', points: 15, isActive: true },
      { id: `${baseId}_u4`, unitNo: 'Unit 4', order: 4, title: 'Accommodation Bills & Insolvency of Drawee', description: 'Mutual accommodation sharing proceeds and bad debts', points: 20, isActive: true }
    ];
  }

  // Final Accounts
  if (normTitle.includes('final accounts')) {
    return [
      { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Preparation of Trading and Profit & Loss Account', description: 'Gross profit, operating expenses, net profit determination', points: 15, isActive: true },
      { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Balance Sheet Marshalling and Classification', description: 'Order of permanence vs liquidity, grouping of items', points: 15, isActive: true },
      { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Comprehensive Year-End Adjustments', description: 'Outstanding, prepaid, depreciation, bad debts provision', points: 20, isActive: true }
    ];
  }

  // Partnership
  if (normTitle.includes('partnership')) {
    return [
      { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Fundamentals & Profit and Loss Appropriation', description: 'Interest on capital, drawings, partners loan, guarantee of profit', points: 15, isActive: true },
      { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Treatment of Goodwill in Partnership Accounts', description: 'Average profit, super profit, capitalisation methods', points: 15, isActive: true },
      { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Admission of a New Partner', description: 'Sacrificing ratio, revaluation of assets and liabilities, hidden goodwill', points: 20, isActive: true },
      { id: `${baseId}_u4`, unitNo: 'Unit 4', order: 4, title: 'Retirement and Death of a Partner', description: 'Gaining ratio, joint life policy, loan account settlement', points: 20, isActive: true },
      { id: `${baseId}_u5`, unitNo: 'Unit 5', order: 5, title: 'Dissolution of Partnership Firm', description: 'Realisation account, settlement of accounts, Garner vs Murray rule', points: 20, isActive: true }
    ];
  }

  // Company Accounts
  if (normTitle.includes('company accounts') || normTitle.includes('shares')) {
    return [
      { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Issue of Shares at Par, Premium & Calls in Arrear/Advance', description: 'Application, allotment, calls, interest calculations', points: 15, isActive: true },
      { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Forfeiture and Re-issue of Shares', description: 'Capital reserve computation on reissue of forfeited shares', points: 20, isActive: true },
      { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Issue and Redemption of Debentures', description: 'Collateral security, discount write-off, debenture redemption reserve', points: 15, isActive: true }
    ];
  }

  // Contract Act
  if (normTitle.includes('contract act')) {
    return [
      { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Nature and Essential Elements of Valid Contracts', description: 'Offer, acceptance, legal relationship, consensus ad idem', points: 10, isActive: true },
      { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Consideration & Capacity of Parties', description: 'Doctrine of privity of contract, minor agreement rules', points: 15, isActive: true },
      { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Free Consent (Coercion, Undue Influence, Fraud)', description: 'Misrepresentation, bilateral and unilateral mistakes', points: 15, isActive: true },
      { id: `${baseId}_u4`, unitNo: 'Unit 4', order: 4, title: 'Performance, Discharge and Remedies for Breach', description: 'Anticipatory vs actual breach, suit for damages, injunction', points: 20, isActive: true },
      { id: `${baseId}_u5`, unitNo: 'Unit 5', order: 5, title: 'Contingent and Quasi Contracts', description: 'Sections 68 to 72, quantum meruit principles', points: 15, isActive: true }
    ];
  }

  // Sale of Goods Act
  if (normTitle.includes('sale of goods')) {
    return [
      { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Formation of Contract of Sale', description: 'Sale vs agreement to sell, existing and future goods', points: 10, isActive: true },
      { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Conditions and Warranties (Express & Implied)', description: 'Caveat emptor and its modern exceptions', points: 15, isActive: true },
      { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Transfer of Property & Passing of Risk', description: 'Nemo dat quod non habet rule and exceptions', points: 15, isActive: true },
      { id: `${baseId}_u4`, unitNo: 'Unit 4', order: 4, title: 'Rights of Unpaid Seller against Goods and Buyer', description: 'Lien, stoppage in transit, right of resale', points: 20, isActive: true }
    ];
  }

  // Economics
  if (normTitle.includes('economics') || normTitle.includes('demand') || normTitle.includes('market')) {
    return [
      { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Theoretical Framework and Fundamentals', description: 'Micro vs macro concepts, elasticity and utility analysis', points: 10, isActive: true },
      { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Applied Principles & Graphical Equilibrium', description: 'Laws of returns, cost curves, market price determination', points: 15, isActive: true },
      { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Case Analysis & Examination Exercises', description: 'Numerical problems, shifts in equilibrium, policy impacts', points: 15, isActive: true }
    ];
  }

  // Standard Default 4 Units for any other chapter
  return [
    { id: `${baseId}_u1`, unitNo: 'Unit 1', order: 1, title: 'Basic Concepts & Conceptual Framework', description: `Key terminology, scope and basic concepts of ${chapterTitle}`, points: 10, isActive: true },
    { id: `${baseId}_u2`, unitNo: 'Unit 2', order: 2, title: 'Statutory Provisions & Methodologies', description: `In-depth analysis and technical provisions of ${chapterTitle}`, points: 15, isActive: true },
    { id: `${baseId}_u3`, unitNo: 'Unit 3', order: 3, title: 'Practical Illustrations & Numerical Problems', description: `Practical examples, working notes and step-by-step problem solving`, points: 20, isActive: true },
    { id: `${baseId}_u4`, unitNo: 'Unit 4', order: 4, title: 'Past Examination Questions & Revision', description: `ICSI / ICAI exam questions, RTP and comprehensive review`, points: 15, isActive: true }
  ];
}

