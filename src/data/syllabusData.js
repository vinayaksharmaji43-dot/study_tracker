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
    ],
    Final: [
      {
        subject: 'Paper 1: Financial Reporting',
        chapters: [
          { id: 'ca_fin_p1_ch1', title: 'Chapter 1: Framework for Financial Reporting using Ind AS' },
          { id: 'ca_fin_p1_ch2', title: 'Chapter 2: Application of Ind AS (Presentation and Disclosures)' },
          { id: 'ca_fin_p1_ch3', title: 'Chapter 3: Ind AS on Assets of the Financial Statements' },
          { id: 'ca_fin_p1_ch4', title: 'Chapter 4: Ind AS on Liabilities of the Financial Statements' },
          { id: 'ca_fin_p1_ch5', title: 'Chapter 5: Ind AS on Items impacting Financial Statements' },
          { id: 'ca_fin_p1_ch6', title: 'Chapter 6: Ind AS on Revenue' },
          { id: 'ca_fin_p1_ch7', title: 'Chapter 7: Ind AS on Financial Instruments' },
          { id: 'ca_fin_p1_ch8', title: 'Chapter 8: Business Combinations & Corporate Restructuring' },
          { id: 'ca_fin_p1_ch9', title: 'Chapter 9: Consolidated Financial Statements' },
          { id: 'ca_fin_p1_ch10', title: 'Chapter 10: Accounting and Reporting of Financial Instruments' }
        ]
      },
      {
        subject: 'Paper 2: Advanced Financial Management',
        chapters: [
          { id: 'ca_fin_p2_ch1', title: 'Chapter 1: Financial Policy and Corporate Strategy' },
          { id: 'ca_fin_p2_ch2', title: 'Chapter 2: Risk Management' },
          { id: 'ca_fin_p2_ch3', title: 'Chapter 3: Advanced Capital Budgeting Decisions' },
          { id: 'ca_fin_p2_ch4', title: 'Chapter 4: Security Analysis' },
          { id: 'ca_fin_p2_ch5', title: 'Chapter 5: Security Valuation' },
          { id: 'ca_fin_p2_ch6', title: 'Chapter 6: Portfolio Management' },
          { id: 'ca_fin_p2_ch7', title: 'Chapter 7: Securitization' },
          { id: 'ca_fin_p2_ch8', title: 'Chapter 8: Mutual Funds' },
          { id: 'ca_fin_p2_ch9', title: 'Chapter 9: Derivatives Analysis and Valuation' },
          { id: 'ca_fin_p2_ch10', title: 'Chapter 10: Foreign Exchange Exposure and Risk Management' },
          { id: 'ca_fin_p2_ch11', title: 'Chapter 11: International Financial Management' },
          { id: 'ca_fin_p2_ch12', title: 'Chapter 12: Interest Rate Risk Management' },
          { id: 'ca_fin_p2_ch13', title: 'Chapter 13: Business Valuation' },
          { id: 'ca_fin_p2_ch14', title: 'Chapter 14: Mergers, Acquisitions and Corporate Restructuring' },
          { id: 'ca_fin_p2_ch15', title: 'Chapter 15: Startup Finance' }
        ]
      },
      {
        subject: 'Paper 3: Advanced Auditing, Assurance and Professional Ethics',
        chapters: [
          { id: 'ca_fin_p3_ch1', title: 'Chapter 1: Quality Management' },
          { id: 'ca_fin_p3_ch2', title: 'Chapter 2: General Auditing Principles and Auditors Responsibilities' },
          { id: 'ca_fin_p3_ch3', title: 'Chapter 3: Audit Planning, Strategy and Execution' },
          { id: 'ca_fin_p3_ch4', title: 'Chapter 4: Materiality, Risk Assessment and Internal Control' },
          { id: 'ca_fin_p3_ch5', title: 'Chapter 5: Audit Evidence' },
          { id: 'ca_fin_p3_ch6', title: 'Chapter 6: Completion and Review' },
          { id: 'ca_fin_p3_ch7', title: 'Chapter 7: Reporting' },
          { id: 'ca_fin_p3_ch8', title: 'Chapter 8: Specialised Areas' },
          { id: 'ca_fin_p3_ch9', title: 'Chapter 9: Audit-Related Services' },
          { id: 'ca_fin_p3_ch10', title: 'Chapter 10: Review of Financial Information' },
          { id: 'ca_fin_p3_ch11', title: 'Chapter 11: Prospective Financial Information and Other Assurance Services' },
          { id: 'ca_fin_p3_ch12', title: 'Chapter 12: Digital Auditing and Assurance' },
          { id: 'ca_fin_p3_ch13', title: 'Chapter 13: Group Audits' },
          { id: 'ca_fin_p3_ch14', title: 'Chapter 14: Special Features of Audit of Banks & Non-Banking Financial Entities' },
          { id: 'ca_fin_p3_ch15', title: 'Chapter 15: Overview of Audit of Public Sector Undertakings' },
          { id: 'ca_fin_p3_ch16', title: 'Chapter 16: Internal Audit' },
          { id: 'ca_fin_p3_ch17', title: 'Chapter 17: Due Diligence, Investigation and Forensic Accounting' },
          { id: 'ca_fin_p3_ch18', title: 'Chapter 18: Emerging Areas: Sustainable Development Goals (SDG) & ESG Assurance' },
          { id: 'ca_fin_p3_ch19', title: 'Chapter 19: Professional Ethics and Liabilities of Auditors' }
        ]
      },
      {
        subject: 'Paper 4: Direct Tax Laws & International Taxation',
        chapters: [
          { id: 'ca_fin_p4_ch1', title: 'Chapter 1: Basic Concepts & Residence and Scope of Total Income' },
          { id: 'ca_fin_p4_ch2', title: 'Chapter 2: Incomes which do not form part of Total Income' },
          { id: 'ca_fin_p4_ch3', title: 'Chapter 3: Profits and Gains of Business or Profession' },
          { id: 'ca_fin_p4_ch4', title: 'Chapter 4: Capital Gains' },
          { id: 'ca_fin_p4_ch5', title: 'Chapter 5: Income from Other Sources' },
          { id: 'ca_fin_p4_ch6', title: 'Chapter 6: Income of Other Persons included in Assessees Total Income' },
          { id: 'ca_fin_p4_ch7', title: 'Chapter 7: Aggregation of Income, Set-Off and Carry Forward of Losses' },
          { id: 'ca_fin_p4_ch8', title: 'Chapter 8: Deductions from Gross Total Income' },
          { id: 'ca_fin_p4_ch9', title: 'Chapter 9: Assessment of Various Entities' },
          { id: 'ca_fin_p4_ch10', title: 'Chapter 10: Assessment of Trusts and Charitable Institutions' },
          { id: 'ca_fin_p4_ch11', title: 'Chapter 11: Tax Planning, Tax Avoidance & Tax Evasion' },
          { id: 'ca_fin_p4_ch12', title: 'Chapter 12: Deduction, Collection and Recovery of Tax' },
          { id: 'ca_fin_p4_ch13', title: 'Chapter 13: Income-tax Authorities' },
          { id: 'ca_fin_p4_ch14', title: 'Chapter 14: Assessment Procedure' },
          { id: 'ca_fin_p4_ch15', title: 'Chapter 15: Appeals and Revision' },
          { id: 'ca_fin_p4_ch16', title: 'Chapter 16: Dispute Resolution & Miscellaneous Provisions' },
          { id: 'ca_fin_p4_ch17', title: 'Chapter 17: Transfer Pricing and Other Anti-Avoidance Measures' },
          { id: 'ca_fin_p4_ch18', title: 'Chapter 18: Non-Resident Taxation' },
          { id: 'ca_fin_p4_ch19', title: 'Chapter 19: Double Taxation Relief (DTAA)' },
          { id: 'ca_fin_p4_ch20', title: 'Chapter 20: Advance Rulings & Model Tax Conventions' }
        ]
      },
      {
        subject: 'Paper 5: Indirect Tax Laws',
        chapters: [
          { id: 'ca_fin_p5_ch1', title: 'Chapter 1: Supply under GST' },
          { id: 'ca_fin_p5_ch2', title: 'Chapter 2: Charge of GST' },
          { id: 'ca_fin_p5_ch3', title: 'Chapter 3: Place of Supply' },
          { id: 'ca_fin_p5_ch4', title: 'Chapter 4: Exemptions from GST' },
          { id: 'ca_fin_p5_ch5', title: 'Chapter 5: Time of Supply' },
          { id: 'ca_fin_p5_ch6', title: 'Chapter 6: Value of Supply' },
          { id: 'ca_fin_p5_ch7', title: 'Chapter 7: Input Tax Credit' },
          { id: 'ca_fin_p5_ch8', title: 'Chapter 8: Registration' },
          { id: 'ca_fin_p5_ch9', title: 'Chapter 9: Tax Invoice, Credit and Debit Notes' },
          { id: 'ca_fin_p5_ch10', title: 'Chapter 10: Accounts and Records; E-way Bill' },
          { id: 'ca_fin_p5_ch11', title: 'Chapter 11: Payment of Tax' },
          { id: 'ca_fin_p5_ch12', title: 'Chapter 12: Electronic Commerce Transactions' },
          { id: 'ca_fin_p5_ch13', title: 'Chapter 13: Returns' },
          { id: 'ca_fin_p5_ch14', title: 'Chapter 14: Import and Export Under GST' },
          { id: 'ca_fin_p5_ch15', title: 'Chapter 15: Refunds' },
          { id: 'ca_fin_p5_ch16', title: 'Chapter 16: Job Work' },
          { id: 'ca_fin_p5_ch17', title: 'Chapter 17: Assessment and Audit' },
          { id: 'ca_fin_p5_ch18', title: 'Chapter 18: Inspection, Search, Seizure and Arrest' },
          { id: 'ca_fin_p5_ch19', title: 'Chapter 19: Demands and Recovery' },
          { id: 'ca_fin_p5_ch20', title: 'Chapter 20: Appeals and Revision' },
          { id: 'ca_fin_p5_ch21', title: 'Chapter 21: Customs Law & Foreign Trade Policy' }
        ]
      },
      {
        subject: 'Paper 6: Integrated Business Solutions',
        chapters: [
          { id: 'ca_fin_p6_ch1', title: 'Chapter 1: Multi-Disciplinary Case Study Analysis' },
          { id: 'ca_fin_p6_ch2', title: 'Chapter 2: Financial Management and Strategic Decision Making' },
          { id: 'ca_fin_p6_ch3', title: 'Chapter 3: Corporate Governance and Ethics in Practice' },
          { id: 'ca_fin_p6_ch4', title: 'Chapter 4: Integrated Direct and Indirect Tax Structuring' },
          { id: 'ca_fin_p6_ch5', title: 'Chapter 5: Business Valuation and Restructuring Solutions' }
        ]
      }
    ]
  },
  CMA: {
    Foundation: [
  {
    id: 'sub_1789667235064_0',
    order: 1,
    subject: 'Paper 1 — Fundamentals of Business Laws and Business Communication',
    chapters: [
      {
        id: 'cma_fnd_p1_ch1',
        chapterNo: 1,
        order: 1,
        title: 'Chapter 1: Introduction to Law and Legislative Process',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p1_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Sources of Law, Legislative Process in India', description: 'Sources of Law, Legislative Process in India', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p1_ch2',
        chapterNo: 2,
        order: 2,
        title: 'Chapter 2: Indian Contract Act, 1872',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p1_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Essential Elements of a Contract, Offer and Acceptance', description: 'Essential elements of a contract, offer and acceptance', points: 10, isActive: true },
          { id: 'cma_fnd_p1_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Consideration, Legality of Object and Consideration', description: 'Consideration, legality of object and consideration', points: 10, isActive: true },
          { id: 'cma_fnd_p1_ch2_u3', unitNo: 'Unit 3', order: 3, title: 'Capacity of Parties, Free Consent', description: 'Capacity of parties, free consent', points: 10, isActive: true },
          { id: 'cma_fnd_p1_ch2_u4', unitNo: 'Unit 4', order: 4, title: 'Void and Voidable Agreements', description: 'Void and voidable agreements', points: 10, isActive: true },
          { id: 'cma_fnd_p1_ch2_u5', unitNo: 'Unit 5', order: 5, title: 'Discharge of Contracts, Breach and Remedies', description: 'Discharge of contracts, breach of contract and remedies', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p1_ch3',
        chapterNo: 3,
        order: 3,
        title: 'Chapter 3: Sale of Goods Act, 1930',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p1_ch3_u1', unitNo: 'Unit 1', order: 1, title: 'Definition, Transfer of Ownership', description: 'Definition, transfer of ownership', points: 10, isActive: true },
          { id: 'cma_fnd_p1_ch3_u2', unitNo: 'Unit 2', order: 2, title: 'Conditions and Warranties', description: 'Conditions and Warranties', points: 10, isActive: true },
          { id: 'cma_fnd_p1_ch3_u3', unitNo: 'Unit 3', order: 3, title: 'Performance of Contract of Sale, Rights of Unpaid Seller', description: 'Performance of the contract of sale, rights of unpaid seller', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p1_ch4',
        chapterNo: 4,
        order: 4,
        title: 'Chapter 4: Negotiable Instruments Act, 1881',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p1_ch4_u1', unitNo: 'Unit 1', order: 1, title: 'Definition & Features of Promissory Note, Bill of Exchange, Cheque', description: 'Definition and features of Promissory Note, Bill of Exchange, and Cheque', points: 10, isActive: true },
          { id: 'cma_fnd_p1_ch4_u2', unitNo: 'Unit 2', order: 2, title: 'Holder and Holder in Due Course', description: 'Holder and Holder in Due Course', points: 10, isActive: true },
          { id: 'cma_fnd_p1_ch4_u3', unitNo: 'Unit 3', order: 3, title: 'Negotiation, Assignment, Dishonour of Negotiable Instruments', description: 'Negotiation and assignment, dishonour of negotiable instruments', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p1_ch5',
        chapterNo: 5,
        order: 5,
        title: 'Chapter 5: Business Communication',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p1_ch5_u1', unitNo: 'Unit 1', order: 1, title: 'Introduction to Business Communication: Process, Types, Channels', description: 'Introduction to Business Communication: Process, types, channels', points: 10, isActive: true },
          { id: 'cma_fnd_p1_ch5_u2', unitNo: 'Unit 2', order: 2, title: 'Barriers to Communication, Effective Communication Skills', description: 'Barriers to communication, effective communication skills', points: 10, isActive: true },
          { id: 'cma_fnd_p1_ch5_u3', unitNo: 'Unit 3', order: 3, title: 'Commercial Letters, Reports, Minutes, and Resume Writing', description: 'Commercial letters, reports, minutes, and resume writing', points: 10, isActive: true }
        ]
      }
    ]
  },
  {
    id: 'sub_1789667235064_1',
    order: 2,
    subject: 'Paper 2 — Fundamentals of Financial and Cost Accounting',
    chapters: [
      {
        id: 'cma_fnd_p2_ch1',
        chapterNo: 1,
        order: 1,
        title: 'Chapter 1: Accounting Fundamentals',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p2_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Accounting Principles, Concepts, and Conventions', description: 'Accounting Principles, Concepts, and Conventions', points: 10, isActive: true },
          { id: 'cma_fnd_p2_ch1_u2', unitNo: 'Unit 2', order: 2, title: 'Capital & Revenue Transactions, Journal, Ledger, Trial Balance', description: 'Capital and Revenue transactions, Journal, Ledger, Trial Balance', points: 10, isActive: true },
          { id: 'cma_fnd_p2_ch1_u3', unitNo: 'Unit 3', order: 3, title: 'Rectification of Errors, Bank Reconciliation Statement (BRS)', description: 'Rectification of Errors, Bank Reconciliation Statement (BRS)', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p2_ch2',
        chapterNo: 2,
        order: 2,
        title: 'Chapter 2: Accounting for Special Transactions',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p2_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Consignment Accounts', description: 'Consignment Accounts', points: 10, isActive: true },
          { id: 'cma_fnd_p2_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Joint Venture Accounts', description: 'Joint Venture Accounts', points: 10, isActive: true },
          { id: 'cma_fnd_p2_ch2_u3', unitNo: 'Unit 3', order: 3, title: 'Bills of Exchange', description: 'Bills of Exchange', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p2_ch3',
        chapterNo: 3,
        order: 3,
        title: 'Chapter 3: Preparation of Final Accounts',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p2_ch3_u1', unitNo: 'Unit 1', order: 1, title: 'Financial Statements of Sole Proprietorship (Trading, P&L, Balance Sheet)', description: 'Preparation of Financial Statements of Sole Proprietorship (Trading, P&L, Balance Sheet)', points: 10, isActive: true },
          { id: 'cma_fnd_p2_ch3_u2', unitNo: 'Unit 2', order: 2, title: 'Financial Statements of Non-Profit Organisations', description: 'Financial Statements of Non-Profit Organisations (Receipts & Payments, Income & Expenditure)', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p2_ch4',
        chapterNo: 4,
        order: 4,
        title: 'Chapter 4: Fundamentals of Cost Accounting',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p2_ch4_u1', unitNo: 'Unit 1', order: 1, title: 'Meaning, Definition, Significance, Elements of Cost', description: 'Meaning, definition, significance, and elements of Cost', points: 10, isActive: true },
          { id: 'cma_fnd_p2_ch4_u2', unitNo: 'Unit 2', order: 2, title: 'Classification of Costs, Cost Centre and Cost Unit', description: 'Classification of costs, Cost Centre and Cost Unit', points: 10, isActive: true },
          { id: 'cma_fnd_p2_ch4_u3', unitNo: 'Unit 3', order: 3, title: 'Preparation of Cost Sheet', description: 'Preparation of Cost Sheet', points: 10, isActive: true }
        ]
      }
    ]
  },
  {
    id: 'sub_1789667235064_2',
    order: 3,
    subject: 'Paper 3 — Fundamentals of Business Mathematics and Statistics',
    chapters: [
      {
        id: 'cma_fnd_p3_ch1',
        chapterNo: 1,
        order: 1,
        title: 'Chapter 1: Arithmetic',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p3_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Ratios, Proportions, and Variations', description: 'Ratios, Proportions, and Variations', points: 10, isActive: true },
          { id: 'cma_fnd_p3_ch1_u2', unitNo: 'Unit 2', order: 2, title: 'Simple and Compound Interest, Annuities', description: 'Simple and Compound Interest, Annuities', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p3_ch2',
        chapterNo: 2,
        order: 2,
        title: 'Chapter 2: Algebra',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p3_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Set Theory', description: 'Set Theory', points: 10, isActive: true },
          { id: 'cma_fnd_p3_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Indices, Logarithms, Permutations, and Combinations', description: 'Indices, Logarithms, Permutations, and Combinations', points: 10, isActive: true },
          { id: 'cma_fnd_p3_ch2_u3', unitNo: 'Unit 3', order: 3, title: 'Quadratic Equations', description: 'Quadratic Equations', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p3_ch3',
        chapterNo: 3,
        order: 3,
        title: 'Chapter 3: Statistical Representation of Data',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p3_ch3_u1', unitNo: 'Unit 1', order: 1, title: 'Diagrammatic and Graphical Representation of Data', description: 'Diagrammatic and Graphical representation of data', points: 10, isActive: true },
          { id: 'cma_fnd_p3_ch3_u2', unitNo: 'Unit 2', order: 2, title: 'Frequency Distribution', description: 'Frequency Distribution', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p3_ch4',
        chapterNo: 4,
        order: 4,
        title: 'Chapter 4: Measures of Central Tendency and Dispersion',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p3_ch4_u1', unitNo: 'Unit 1', order: 1, title: 'Mean, Median, Mode, AM, GM, HM', description: 'Mean, Median, Mode, AM, GM, HM', points: 10, isActive: true },
          { id: 'cma_fnd_p3_ch4_u2', unitNo: 'Unit 2', order: 2, title: 'Mean Deviation, Standard Deviation, Quartile Deviation, Variance', description: 'Mean Deviation, Standard Deviation, Quartile Deviation, Variance', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p3_ch5',
        chapterNo: 5,
        order: 5,
        title: 'Chapter 5: Measures of Skewness',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p3_ch5_u1', unitNo: 'Unit 1', order: 1, title: 'Karl Pearson and Bowley\'s Coefficients of Skewness', description: 'Karl Pearson and Bowley\'s Coefficients of Skewness', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p3_ch6',
        chapterNo: 6,
        order: 6,
        title: 'Chapter 6: Correlation and Regression',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p3_ch6_u1', unitNo: 'Unit 1', order: 1, title: 'Scatter Diagram, Karl Pearson\'s Coefficient of Correlation', description: 'Scatter diagram, Karl Pearson\'s Coefficient of Correlation', points: 10, isActive: true },
          { id: 'cma_fnd_p3_ch6_u2', unitNo: 'Unit 2', order: 2, title: 'Regression Lines and Equations', description: 'Regression lines and equations', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p3_ch7',
        chapterNo: 7,
        order: 7,
        title: 'Chapter 7: Probability',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p3_ch7_u1', unitNo: 'Unit 1', order: 1, title: 'Independent and Dependent Events, Addition & Multiplication Theorems', description: 'Independent and dependent events, Addition and Multiplication Theorems', points: 10, isActive: true },
          { id: 'cma_fnd_p3_ch7_u2', unitNo: 'Unit 2', order: 2, title: 'Conditional Probability', description: 'Conditional Probability', points: 10, isActive: true }
        ]
      }
    ]
  },
  {
    id: 'sub_1789667235064_3',
    order: 4,
    subject: 'Paper 4 — Fundamentals of Business Economics and Management',
    chapters: [
      {
        id: 'cma_fnd_p4_ch1',
        chapterNo: 1,
        order: 1,
        title: 'Chapter 1: Basic Concepts of Economics',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p4_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Nature, Scope, and Basic Problems of an Economy', description: 'Nature, scope, and basic problems of an economy', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p4_ch2',
        chapterNo: 2,
        order: 2,
        title: 'Chapter 2: Theory of Demand and Supply',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p4_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Law of Demand, Elasticity, Law of Supply, Market Equilibrium', description: 'Law of Demand, Elasticity of Demand, Law of Supply, Market Equilibrium', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p4_ch3',
        chapterNo: 3,
        order: 3,
        title: 'Chapter 3: Theory of Production and Cost',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p4_ch3_u1', unitNo: 'Unit 1', order: 1, title: 'Production Function, Variable Proportions, Returns to Scale, Cost Concepts', description: 'Production Function, Law of Variable Proportions, Returns to Scale, Cost concepts', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p4_ch4',
        chapterNo: 4,
        order: 4,
        title: 'Chapter 4: Market Forms',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p4_ch4_u1', unitNo: 'Unit 1', order: 1, title: 'Perfect Competition, Monopoly, Monopolistic Competition, Oligopoly', description: 'Perfect Competition, Monopoly, Monopolistic Competition, Oligopoly', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p4_ch5',
        chapterNo: 5,
        order: 5,
        title: 'Chapter 5: Money and Banking',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p4_ch5_u1', unitNo: 'Unit 1', order: 1, title: 'Functions of Money, Commercial Banks, RBI and Monetary Policy', description: 'Functions of Money, Commercial Banks, Reserve Bank of India (RBI) and Monetary Policy', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_fnd_p4_ch6',
        chapterNo: 6,
        order: 6,
        title: 'Chapter 6: Management Process',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_fnd_p4_ch6_u1', unitNo: 'Unit 1', order: 1, title: 'Evolution of Management Thought', description: 'Evolution of Management thought', points: 10, isActive: true },
          { id: 'cma_fnd_p4_ch6_u2', unitNo: 'Unit 2', order: 2, title: 'Planning, Organizing, Staffing, Directing, Coordinating, Controlling', description: 'Planning, Organizing, Staffing, Directing, Coordinating, and Controlling', points: 10, isActive: true },
          { id: 'cma_fnd_p4_ch6_u3', unitNo: 'Unit 3', order: 3, title: 'Leadership, Motivation, and Decision Making', description: 'Leadership, Motivation, and Decision Making', points: 10, isActive: true }
        ]
      }
    ]
  }
],
Intermediate: [
  {
    id: 'sub_1789667239761_0',
    order: 1,
    subject: 'Group I: Paper 5 — Business Laws and Ethics',
    chapters: [
      {
        id: 'cma_int_p5_ch1',
        chapterNo: 1,
        order: 1,
        title: 'Chapter 1: Commercial Laws',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p5_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Indian Contract Act, 1872 (Indemnity, Guarantee, Bailment, Pledge, Agency)', description: 'Advanced concepts, Indemnity, Guarantee, Bailment, Pledge, Agency', points: 10, isActive: true },
          { id: 'cma_int_p5_ch1_u2', unitNo: 'Unit 2', order: 2, title: 'Sale of Goods Act, 1930', description: 'Sale of Goods Act, 1930', points: 10, isActive: true },
          { id: 'cma_int_p5_ch1_u3', unitNo: 'Unit 3', order: 3, title: 'Negotiable Instruments Act, 1881', description: 'Negotiable Instruments Act, 1881', points: 10, isActive: true },
          { id: 'cma_int_p5_ch1_u4', unitNo: 'Unit 4', order: 4, title: 'Indian Partnership Act, 1932 & Limited Liability Partnership Act, 2008', description: 'Indian Partnership Act, 1932 & Limited Liability Partnership Act, 2008', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p5_ch2',
        chapterNo: 2,
        order: 2,
        title: 'Chapter 2: Industrial Laws',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p5_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Factories Act, 1948; Payment of Wages Act, 1936; Minimum Wages Act, 1948', description: 'Factories Act, 1948; Payment of Wages Act, 1936; Minimum Wages Act, 1948', points: 10, isActive: true },
          { id: 'cma_int_p5_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Employees\' Provident Funds, ESI, Bonus, Gratuity Acts', description: 'Employees\' Provident Funds Act, 1952; ESI Act, 1948; Payment of Bonus Act, 1965; Payment of Gratuity Act, 1972', points: 10, isActive: true },
          { id: 'cma_int_p5_ch2_u3', unitNo: 'Unit 3', order: 3, title: 'Code on Wages, 2019', description: 'Code on Wages, 2019', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p5_ch3',
        chapterNo: 3,
        order: 3,
        title: 'Chapter 3: Corporate Laws',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p5_ch3_u1', unitNo: 'Unit 1', order: 1, title: 'Companies Act, 2013 (Incorporation, Shares, Directors, Meetings, Management)', description: 'Companies Act, 2013 (Incorporation, Shares, Directors, Meetings, Management)', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p5_ch4',
        chapterNo: 4,
        order: 4,
        title: 'Chapter 4: Business Ethics',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p5_ch4_u1', unitNo: 'Unit 1', order: 1, title: 'Business Ethics and Emotional Intelligence', description: 'Business Ethics and Emotional Intelligence', points: 10, isActive: true }
        ]
      }
    ]
  },
  {
    id: 'sub_1789667239761_1',
    order: 2,
    subject: 'Group I: Paper 6 — Financial Accounting',
    chapters: [
      {
        id: 'cma_int_p6_ch1',
        chapterNo: 1,
        order: 1,
        title: 'Chapter 1: Accounting Fundamentals & Special Transactions',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p6_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Accounting Process & Framework', description: 'Accounting Process & Framework', points: 10, isActive: true },
          { id: 'cma_int_p6_ch1_u2', unitNo: 'Unit 2', order: 2, title: 'Bills of Exchange, Consignment, Joint Venture', description: 'Bills of Exchange, Consignment, Joint Venture', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p6_ch2',
        chapterNo: 2,
        order: 2,
        title: 'Chapter 2: Preparation of Financial Statements',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p6_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Profit & Loss Account and Balance Sheet (Sole Proprietorship & Partnership)', description: 'Profit & Loss Account and Balance Sheet (Sole Proprietorship & Partnership)', points: 10, isActive: true },
          { id: 'cma_int_p6_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Non-Profit Organisations & Single Entry System', description: 'Non-Profit Organisations & Single Entry System', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p6_ch3',
        chapterNo: 3,
        order: 3,
        title: 'Chapter 3: Self-Balancing Ledgers, Royalties, Hire Purchase',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p6_ch3_u1', unitNo: 'Unit 1', order: 1, title: 'Self-Balancing Ledgers, Royalty Accounts, Hire Purchase & Installment System', description: 'Self-Balancing Ledgers, Royalty Accounts, Hire Purchase, and Installment System', points: 10, isActive: true },
          { id: 'cma_int_p6_ch3_u2', unitNo: 'Unit 2', order: 2, title: 'Branch & Departmental Accounts, Insurance Claims', description: 'Branch & Departmental Accounts, Insurance Claims', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p6_ch4',
        chapterNo: 4,
        order: 4,
        title: 'Chapter 4: Accounting Standards',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p6_ch4_u1', unitNo: 'Unit 1', order: 1, title: 'Overview of Accounting Standards (AS)', description: 'Overview of Accounting Standards (AS)', points: 10, isActive: true }
        ]
      }
    ]
  },
  {
    id: 'sub_1789667239761_2',
    order: 3,
    subject: 'Group I: Paper 7 — Direct and Indirect Taxation',
    chapters: [
      {
        id: 'cma_int_p7_ch1',
        chapterNo: 1,
        order: 1,
        title: 'Chapter 1: Direct Taxation',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p7_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Basic Concepts and Residential Status', description: 'Basic Concepts and Residential Status', points: 10, isActive: true },
          { id: 'cma_int_p7_ch1_u2', unitNo: 'Unit 2', order: 2, title: 'Heads of Income (Salary, HP, PGBP, Capital Gains, Other Sources)', description: 'Heads of Income (Salary, House Property, PGBP, Capital Gains, Other Sources)', points: 10, isActive: true },
          { id: 'cma_int_p7_ch1_u3', unitNo: 'Unit 3', order: 3, title: 'Clubbing of Income, Set-off & Carry Forward, Chapter VI-A Deductions', description: 'Clubbing of Income, Set-off and Carry Forward, Deductions (Chapter VI-A)', points: 10, isActive: true },
          { id: 'cma_int_p7_ch1_u4', unitNo: 'Unit 4', order: 4, title: 'Computation of Total Income and Tax Liability of Individuals', description: 'Computation of Total Income and Tax Liability of Individuals', points: 10, isActive: true },
          { id: 'cma_int_p7_ch1_u5', unitNo: 'Unit 5', order: 5, title: 'TDS, TCS, Advance Tax, and Return Filing', description: 'TDS, TCS, Advance Tax, and Return Filing', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p7_ch2',
        chapterNo: 2,
        order: 2,
        title: 'Chapter 2: Indirect Taxation',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p7_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Concept of Indirect Taxes & GST Fundamentals', description: 'Concept of Indirect Taxes & GST Fundamentals', points: 10, isActive: true },
          { id: 'cma_int_p7_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Levy and Collection of GST, Supply (Time, Value, Place)', description: 'Levy and Collection of GST, Supply (Time, Value, Place)', points: 10, isActive: true },
          { id: 'cma_int_p7_ch2_u3', unitNo: 'Unit 3', order: 3, title: 'Input Tax Credit (ITC), Registration under GST', description: 'Input Tax Credit (ITC), Registration under GST', points: 10, isActive: true },
          { id: 'cma_int_p7_ch2_u4', unitNo: 'Unit 4', order: 4, title: 'GST Invoices, Returns, and Customs Act Basic Concepts', description: 'GST Invoices, Returns, and Customs Act Basic Concepts', points: 10, isActive: true }
        ]
      }
    ]
  },
  {
    id: 'sub_1789667239761_3',
    order: 4,
    subject: 'Group I: Paper 8 — Cost Accounting',
    chapters: [
      {
        id: 'cma_int_p8_ch1',
        chapterNo: 1,
        order: 1,
        title: 'Chapter 1: Cost Accounting Introduction & Elements of Cost',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p8_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Introduction to Cost Accounting', description: 'Introduction to Cost Accounting', points: 10, isActive: true },
          { id: 'cma_int_p8_ch1_u2', unitNo: 'Unit 2', order: 2, title: 'Material Costs, Employee Costs, Direct Expenses', description: 'Material Costs, Employee Costs, Direct Expenses', points: 10, isActive: true },
          { id: 'cma_int_p8_ch1_u3', unitNo: 'Unit 3', order: 3, title: 'Overheads (Production, Administration, Selling & Distribution)', description: 'Overheads (Production, Administration, Selling & Distribution)', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p8_ch2',
        chapterNo: 2,
        order: 2,
        title: 'Chapter 2: Methods of Costing',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p8_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Job, Batch, and Contract Costing', description: 'Job, Batch, and Contract Costing', points: 10, isActive: true },
          { id: 'cma_int_p8_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Process Costing, Joint Products & By-Products', description: 'Process Costing, Joint Products & By-Products', points: 10, isActive: true },
          { id: 'cma_int_p8_ch2_u3', unitNo: 'Unit 3', order: 3, title: 'Operating / Service Costing', description: 'Operating/Service Costing', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p8_ch3',
        chapterNo: 3,
        order: 3,
        title: 'Chapter 3: Cost Accounting Records & Techniques',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p8_ch3_u1', unitNo: 'Unit 1', order: 1, title: 'Cost Control Accounts, Integral and Non-Integral Systems', description: 'Cost Control Accounts, Integral and Non-Integral Systems', points: 10, isActive: true },
          { id: 'cma_int_p8_ch3_u2', unitNo: 'Unit 2', order: 2, title: 'Standard Costing, Marginal Costing, Budgetary Control', description: 'Standard Costing, Marginal Costing, Budgetary Control', points: 10, isActive: true }
        ]
      }
    ]
  },
  {
    id: 'sub_1789667239761_4',
    order: 5,
    subject: 'Group II: Paper 9 — Operations Management and Strategic Management',
    chapters: [
      {
        id: 'cma_int_p9_ch1',
        chapterNo: 1,
        order: 1,
        title: 'Chapter 1: Operations Management',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p9_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Operations Management Introduction', description: 'Operations Management Introduction', points: 10, isActive: true },
          { id: 'cma_int_p9_ch1_u2', unitNo: 'Unit 2', order: 2, title: 'Operations Planning & Design', description: 'Operations Planning & Design', points: 10, isActive: true },
          { id: 'cma_int_p9_ch1_u3', unitNo: 'Unit 3', order: 3, title: 'Production Planning and Control (PPC)', description: 'Production Planning and Control (PPC)', points: 10, isActive: true },
          { id: 'cma_int_p9_ch1_u4', unitNo: 'Unit 4', order: 4, title: 'Productivity Management, Project Management (PERT/CPM)', description: 'Productivity Management, Project Management (PERT/CPM)', points: 10, isActive: true },
          { id: 'cma_int_p9_ch1_u5', unitNo: 'Unit 5', order: 5, title: 'Economics of Maintenance and Spares Management', description: 'Economics of Maintenance and Spares Management', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p9_ch2',
        chapterNo: 2,
        order: 2,
        title: 'Chapter 2: Strategic Management',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p9_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Strategic Management Introduction', description: 'Strategic Management Introduction', points: 10, isActive: true },
          { id: 'cma_int_p9_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Strategic Analysis and Strategic Planning', description: 'Strategic Analysis and Strategic Planning', points: 10, isActive: true },
          { id: 'cma_int_p9_ch2_u3', unitNo: 'Unit 3', order: 3, title: 'Strategy Implementation and Control', description: 'Strategy Implementation and Control', points: 10, isActive: true }
        ]
      }
    ]
  },
  {
    id: 'sub_1789667239761_5',
    order: 6,
    subject: 'Group II: Paper 10 — Corporate Accounting and Auditing',
    chapters: [
      {
        id: 'cma_int_p10_ch1',
        chapterNo: 1,
        order: 1,
        title: 'Chapter 1: Corporate Accounting',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p10_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Accounting for Shares and Debentures', description: 'Accounting for Shares and Debentures', points: 10, isActive: true },
          { id: 'cma_int_p10_ch1_u2', unitNo: 'Unit 2', order: 2, title: 'Preparation of Financial Statements of Companies', description: 'Preparation of Financial Statements of Companies', points: 10, isActive: true },
          { id: 'cma_int_p10_ch1_u3', unitNo: 'Unit 3', order: 3, title: 'Cash Flow Statement, Valuation of Shares & Goodwill', description: 'Cash Flow Statement, Valuation of Shares & Goodwill', points: 10, isActive: true },
          { id: 'cma_int_p10_ch1_u4', unitNo: 'Unit 4', order: 4, title: 'Accounting for Banking, Electricity, and Insurance Companies', description: 'Accounting for Banking, Electricity, and Insurance Companies', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p10_ch2',
        chapterNo: 2,
        order: 2,
        title: 'Chapter 2: Auditing',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p10_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Basic Concepts of Auditing', description: 'Basic Concepts of Auditing', points: 10, isActive: true },
          { id: 'cma_int_p10_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Provisions Relating to Audit under Companies Act', description: 'Provision Relating to Audit under Companies Act', points: 10, isActive: true },
          { id: 'cma_int_p10_ch2_u3', unitNo: 'Unit 3', order: 3, title: 'Auditing Techniques, Internal Audit, Auditing Standards', description: 'Auditing Techniques, Internal Audit, Auditing Standards', points: 10, isActive: true }
        ]
      }
    ]
  },
  {
    id: 'sub_1789667239761_6',
    order: 7,
    subject: 'Group II: Paper 11 — Financial Management and Business Data Analytics',
    chapters: [
      {
        id: 'cma_int_p11_ch1',
        chapterNo: 1,
        order: 1,
        title: 'Chapter 1: Financial Management',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p11_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Introduction to Financial Management', description: 'Introduction to Financial Management', points: 10, isActive: true },
          { id: 'cma_int_p11_ch1_u2', unitNo: 'Unit 2', order: 2, title: 'Tools for Financial Analysis (Ratio Analysis, Cash Flow)', description: 'Tools for Financial Analysis (Ratio Analysis, Cash Flow)', points: 10, isActive: true },
          { id: 'cma_int_p11_ch1_u3', unitNo: 'Unit 3', order: 3, title: 'Working Capital Management', description: 'Working Capital Management', points: 10, isActive: true },
          { id: 'cma_int_p11_ch1_u4', unitNo: 'Unit 4', order: 4, title: 'Cost of Capital, Capital Structure, Leverage, Dividend Decisions', description: 'Cost of Capital, Capital Structure, Leverage, Dividend Decisions', points: 10, isActive: true },
          { id: 'cma_int_p11_ch1_u5', unitNo: 'Unit 5', order: 5, title: 'Capital Budgeting & Investment Decisions', description: 'Capital Budgeting & Investment Decisions', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p11_ch2',
        chapterNo: 2,
        order: 2,
        title: 'Chapter 2: Business Data Analytics',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p11_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Data Analytics Framework, Big Data, Data Types', description: 'Data Analytics Framework, Big Data, Data Types', points: 10, isActive: true },
          { id: 'cma_int_p11_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Data Visualization, AI, Blockchain, ERP Basics', description: 'Data Visualization, AI, Blockchain, ERP Basics', points: 10, isActive: true }
        ]
      }
    ]
  },
  {
    id: 'sub_1789667239761_7',
    order: 8,
    subject: 'Group II: Paper 12 — Management Accounting',
    chapters: [
      {
        id: 'cma_int_p12_ch1',
        chapterNo: 1,
        order: 1,
        title: 'Chapter 1: Management Accounting Introduction & Tools',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p12_ch1_u1', unitNo: 'Unit 1', order: 1, title: 'Introduction to Management Accounting', description: 'Introduction to Management Accounting', points: 10, isActive: true },
          { id: 'cma_int_p12_ch1_u2', unitNo: 'Unit 2', order: 2, title: 'Activity-Based Costing (ABC)', description: 'Activity-Based Costing (ABC)', points: 10, isActive: true },
          { id: 'cma_int_p12_ch1_u3', unitNo: 'Unit 3', order: 3, title: 'Marginal Costing & Decision Making Tools', description: 'Marginal Costing & Decision Making Tools', points: 10, isActive: true }
        ]
      },
      {
        id: 'cma_int_p12_ch2',
        chapterNo: 2,
        order: 2,
        title: 'Chapter 2: Advanced Cost & Management Accounting',
        points: 10,
        isActive: true,
        units: [
          { id: 'cma_int_p12_ch2_u1', unitNo: 'Unit 1', order: 1, title: 'Advanced Applications of Standard Costing & Variance Analysis', description: 'Advanced Applications of Standard Costing & Variance Analysis', points: 10, isActive: true },
          { id: 'cma_int_p12_ch2_u2', unitNo: 'Unit 2', order: 2, title: 'Transfer Pricing', description: 'Transfer Pricing', points: 10, isActive: true },
          { id: 'cma_int_p12_ch2_u3', unitNo: 'Unit 3', order: 3, title: 'Budgetary Control & Performance Measurement, Reporting to Management', description: 'Budgetary Control & Performance Measurement, Reporting to Management', points: 10, isActive: true }
        ]
      }
    ]
  }
],
    Final: [
      {
        subject: 'Paper 13: Corporate and Economic Laws',
        chapters: [
          { id: 'cma_fin_p13_ch1', title: 'Chapter 1: Companies Act: Management and Administration' },
          { id: 'cma_fin_p13_ch2', title: 'Chapter 2: Corporate Governance and Social Responsibility' },
          { id: 'cma_fin_p13_ch3', title: 'Chapter 3: Insolvency and Bankruptcy Code (IBC), 2016' },
          { id: 'cma_fin_p13_ch4', title: 'Chapter 4: SEBI Laws and Regulations' },
          { id: 'cma_fin_p13_ch5', title: 'Chapter 5: Competition Act, 2002' },
          { id: 'cma_fin_p13_ch6', title: 'Chapter 6: Foreign Exchange Management Act (FEMA), 1999' },
          { id: 'cma_fin_p13_ch7', title: 'Chapter 7: Prevention of Money Laundering Act, 2002' }
        ]
      },
      {
        subject: 'Paper 14: Strategic Financial Management',
        chapters: [
          { id: 'cma_fin_p14_ch1', title: 'Chapter 1: Investment Decisions & Project Planning' },
          { id: 'cma_fin_p14_ch2', title: 'Chapter 2: Financial Markets and Institutions' },
          { id: 'cma_fin_p14_ch3', title: 'Chapter 3: Security Analysis & Portfolio Management' },
          { id: 'cma_fin_p14_ch4', title: 'Chapter 4: Financial Risk Management (Derivatives, Swaps, Futures)' },
          { id: 'cma_fin_p14_ch5', title: 'Chapter 5: International Financial Management' },
          { id: 'cma_fin_p14_ch6', title: 'Chapter 6: Digital Finance & FinTech in CMA' }
        ]
      },
      {
        subject: 'Paper 15: Direct Tax Laws and International Taxation',
        chapters: [
          { id: 'cma_fin_p15_ch1', title: 'Chapter 1: Assessment of Companies & Non-Corporate Entities' },
          { id: 'cma_fin_p15_ch2', title: 'Chapter 2: Tax Planning and Business Reorganization' },
          { id: 'cma_fin_p15_ch3', title: 'Chapter 3: Dispute Resolution, Appeals and Revisions' },
          { id: 'cma_fin_p15_ch4', title: 'Chapter 4: International Taxation & Transfer Pricing' },
          { id: 'cma_fin_p15_ch5', title: 'Chapter 5: GAAR & Model Tax Conventions (DTAA)' }
        ]
      },
      {
        subject: 'Paper 16: Strategic Cost Management',
        chapters: [
          { id: 'cma_fin_p16_ch1', title: 'Chapter 1: Strategic Cost Management in Decision Making' },
          { id: 'cma_fin_p16_ch2', title: 'Chapter 2: Activity-Based Cost Management (ABM)' },
          { id: 'cma_fin_p16_ch3', title: 'Chapter 3: Target Costing, Life Cycle Costing & Kaizen' },
          { id: 'cma_fin_p16_ch4', title: 'Chapter 4: Pricing Strategies and Cost Control' },
          { id: 'cma_fin_p16_ch5', title: 'Chapter 5: Transfer Pricing in Multinational Companies' },
          { id: 'cma_fin_p16_ch6', title: 'Chapter 6: Performance Measurement & Balanced Scorecard' }
        ]
      },
      {
        subject: 'Paper 17: Cost and Management Audit',
        chapters: [
          { id: 'cma_fin_p17_ch1', title: 'Chapter 1: Cost Accounting Standards (CAS)' },
          { id: 'cma_fin_p17_ch2', title: 'Chapter 2: Cost Audit: Legal Framework and Companies Rules' },
          { id: 'cma_fin_p17_ch3', title: 'Chapter 3: Cost Audit Documentation and Audit Program' },
          { id: 'cma_fin_p17_ch4', title: 'Chapter 4: Management Audit & Operational Auditing' },
          { id: 'cma_fin_p17_ch5', title: 'Chapter 5: Internal Control and Internal Audit' }
        ]
      },
      {
        subject: 'Paper 18: Corporate Financial Reporting',
        chapters: [
          { id: 'cma_fin_p18_ch1', title: 'Chapter 1: Ind AS / IFRS Comprehensive Framework' },
          { id: 'cma_fin_p18_ch2', title: 'Chapter 2: Consolidated Financial Statements' },
          { id: 'cma_fin_p18_ch3', title: 'Chapter 3: Accounting for Financial Instruments' },
          { id: 'cma_fin_p18_ch4', title: 'Chapter 4: Valuation of Shares and Business' },
          { id: 'cma_fin_p18_ch5', title: 'Chapter 5: Reporting on Sustainability & Triple Bottom Line' }
        ]
      },
      {
        subject: 'Paper 19: Indirect Tax Laws and Practice',
        chapters: [
          { id: 'cma_fin_p19_ch1', title: 'Chapter 1: Advanced GST Law, Rules & Compliance' },
          { id: 'cma_fin_p19_ch2', title: 'Chapter 2: Valuation, Time and Place of Supply under GST' },
          { id: 'cma_fin_p19_ch3', title: 'Chapter 3: Input Tax Credit Restrictions & Reversals' },
          { id: 'cma_fin_p19_ch4', title: 'Chapter 4: Customs Law & Valuation of Imported Goods' },
          { id: 'cma_fin_p19_ch5', title: 'Chapter 5: Foreign Trade Policy & SEZ Regulations' }
        ]
      },
      {
        subject: 'Paper 20: Strategic Performance Management and Business Valuation',
        chapters: [
          { id: 'cma_fin_p20_ch1', title: 'Chapter 1: Performance Management Concepts and Tools' },
          { id: 'cma_fin_p20_ch2', title: 'Chapter 2: Economic Efficiency of the Firm' },
          { id: 'cma_fin_p20_ch3', title: 'Chapter 3: Enterprise Risk Management (ERM)' },
          { id: 'cma_fin_p20_ch4', title: 'Chapter 4: Business Valuation Models & Methods' },
          { id: 'cma_fin_p20_ch5', title: 'Chapter 5: Valuation of Intangible Assets and Brands' }
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

  const combined = `${userCourse || ''} ${userLevel || ''}`.toUpperCase();
  if (combined.includes('FINAL')) {
    levelKey = 'Final';
  } else if (combined.includes('INTER')) {
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

