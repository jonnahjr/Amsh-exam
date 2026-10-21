/**
 * Fix Exam 4 - Behavioral Competency Comprehensive Assessment (PostgreSQL)
 *
 * Applies the same question fixes to the Supabase/PostgreSQL database.
 *
 * Run: node --env-file=.env scripts/fix-exam4-questions-pg.cjs
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const SUBJECT_SLUG = 'bc-exam-4-comprehensive';
const TEMPLATE_SLUG = 'bcc-exam-4-behavioral-competency-comprehensive-assessment';

const FIXED_QUESTIONS = [
  {
    id: '1cc89dbe-6107-4d35-981c-5297eff23df1',
    questionText: 'What do behavioral competency units integrate to drive operational excellence in public sector operations?',
    options: ['Knowledge, skills, and cognitive perspective', 'Political affiliations and personal connections', 'Financial budgets and equipment assets', 'Physical office infrastructure and facilities management'],
    correctIndex: 0,
    explanation: 'Behavioral competency units integrate knowledge, skills, and cognitive perspective to build the professional capabilities needed for operational excellence in public institutions.'
  },
  {
    id: '5e26dd6f-76dd-4bc0-976f-73240771fe96',
    questionText: 'What type of mindset does the Work pillar foster in civil servants regarding daily responsibilities?',
    options: ['Aligning them directly with institutional policies, strategies, and plans', 'Treating them as temporary administrative chores', 'Delegating all tasks to external contractors', 'Focusing exclusively on individual performance without strategic linkage'],
    correctIndex: 0,
    explanation: 'The Work pillar fosters a mindset of aligning daily responsibilities directly with institutional policies, strategies, and long-term plans to drive value and efficiency.'
  },
  {
    id: '731c93af-cc66-45dc-bc39-e862e85c37a1',
    questionText: 'What cognitive discipline enables professionals to see the broader systemic horizon and connect daily tasks to national development outcomes?',
    options: ['Strategic Thinking', 'Short-term firefighting', 'Reactive data entry', 'Passive administrative compliance'],
    correctIndex: 0,
    explanation: 'Strategic Thinking is the cognitive discipline that allows professionals to rise above daily operational noise and connect their work to the broader national development agenda.'
  },
  {
    id: '8f3d2db9-828f-4b2d-ac92-7c06ed7fdcf8',
    questionText: 'How does the behavioral competency framework describe the relationship between strategic leadership and government policy?',
    options: ['As a bridge between high-level government policy and grassroots execution', 'As an entirely separate political division', 'As a barrier that blocks policy implementation', 'As an optional advisory role with no enforcement power'],
    correctIndex: 0,
    explanation: 'Strategic leadership acts as the critical bridge that translates high-level government policy into practical, ground-level execution across public institutions.'
  },
  {
    id: 'e463009d-53c7-4524-959a-cfbfd741e386',
    questionText: 'What is the effect of prioritizing high-impact initiatives during resource allocation in public administration?',
    options: ['Maximizing public investment returns and eliminating wasteful redundancy', 'Increasing administrative costs across all departments', 'Slowing down public service delivery', 'Creating duplicated spending units across regional bureaus'],
    correctIndex: 0,
    explanation: 'Prioritizing high-impact initiatives ensures that limited public resources are directed to where they generate the greatest societal return while eliminating wasteful redundancy.'
  },
  {
    id: 'e66ddc91-5244-43de-a20f-f40d17ad8dc1',
    questionText: 'What does weak strategic capability manifest as in daily work patterns?',
    options: ['Reactive decision-making, isolated silos, and ignoring macro-environmental shifts', 'Advanced future foresight and data-driven analysis', 'Seamless cross-sectoral coordination', 'Proactive risk mitigation and scenario planning'],
    correctIndex: 0,
    explanation: 'Weak strategic capability reveals itself through reactive decision-making, departmental isolation, and a failure to monitor and respond to macro-environmental changes.'
  },
  {
    id: 'f30c1f5d-09ec-4bba-8464-48fca74c9019',
    questionText: 'What competency level represents a "Visionary / Systems Thinker" on the 3-tier behavioral anchor scale?',
    options: ['Level 1', 'Level 2', 'Level 3', 'Level 0 (baseline)'],
    correctIndex: 2,
    explanation: 'Level 3 on the behavioral anchor scale represents the "Visionary / Systems Thinker" — the highest tier, characterized by advanced foresight, multi-scenario planning, and systemic leadership.'
  },
  {
    id: '0e36a132-7e54-4961-8438-7d3b66585f43',
    questionText: 'What assessment tool requires candidates to take a broad national proclamation and translate it into a structured institutional strategy with KPIs?',
    options: ['Policy-Drafting Simulations', 'The Eisenhower Matrix', 'PESTEL Analysis', 'Balanced Scorecard Review'],
    correctIndex: 0,
    explanation: "Policy-Drafting Simulations test a candidate's ability to operationalize national proclamations into structured institutional strategies complete with measurable KPIs."
  },
  {
    id: 'd4eaab52-7029-4753-8d7b-0f18053fd17c',
    questionText: 'What official civil service description defines innovation regarding operational systems?',
    options: ['Transforming mindsets, generating and contextualizing new ideas into practical applications, and evaluating events from multiple angles', 'Strictly enforcing historical administrative precedents without change', 'Banning all digital tools in favor of manual record-keeping', 'Maximizing compliance with existing standard operating procedures'],
    correctIndex: 0,
    explanation: 'Innovation in civil service is officially defined as transforming mindsets, generating/contextualizing ideas into practical applications, and multi-angle evaluation of events.'
  },
  {
    id: '5f13c689-1dc8-4055-9ce4-88ea401c3ff1',
    questionText: 'What is the role of prototyping and pilot testing under the innovation competency?',
    options: ['To test small-scale models or draft workflows before agency-wide rollout', 'To guarantee immediate project failure across all units', 'To increase processing times and red tape', 'To replace all existing legislation with experimental procedures'],
    correctIndex: 0,
    explanation: 'Prototyping and pilot testing allow innovators to validate small-scale models or draft workflows in a controlled environment, minimizing risk before full institutional deployment.'
  },
  {
    id: '5b10268b-5f74-4138-8a2f-bcb424735996',
    questionText: 'How does market building define the economic role of public administrators?',
    options: ['As economic enablers who design, facilitate, and nurture environments where commerce and investment thrive', 'As restrictive gatekeepers who police compliance with suspicion', 'As private business owners competing against startups', 'As passive observers of market fluctuations with no interventionist role'],
    correctIndex: 0,
    explanation: 'Market building repositions public administrators as economic enablers who actively design and nurture business environments, rather than passive bureaucrats or restrictive gatekeepers.'
  },
  {
    id: 'aa25b585-24b0-4f51-9872-ce731626224c',
    questionText: 'What does value chain mapping systematically break down in an industry?',
    options: ['The lifecycle from raw material sourcing to final consumer delivery to pinpoint cost inflations and bottlenecks', 'The personal bank accounts of corporate executives', 'The political affiliations of chamber of commerce members', 'The internal promotion structure of government ministries'],
    correctIndex: 0,
    explanation: 'Value chain mapping traces the complete industry lifecycle from raw material sourcing to consumer delivery, identifying cost inflations, bottlenecks, and inefficiencies at each stage.'
  },
  {
    id: 'e6b71c3f-41d3-4219-a7f7-04cb7bc6d25d',
    questionText: 'What is the purpose of establishing Regulatory Impact Assessments (RIAs)?',
    options: ['To measure the potential financial, operational, and compliance burden of new rules on businesses before enactment', 'To delay administrative approvals indefinitely', 'To increase tax collection quotas by 300%', 'To eliminate all consumer protection standards from national legislation'],
    correctIndex: 0,
    explanation: 'Regulatory Impact Assessments (RIAs) evaluate the financial, operational, and compliance burdens that new regulations would impose on businesses before those rules take legal effect.'
  },
  {
    id: 'b6e3dccc-589e-4072-a8a7-476f9beb6130',
    questionText: 'What operational function does role-modeling leadership serve within civil service structures?',
    options: ['Serving as the operational bridge between high-level policy guidelines and everyday public service delivery', 'Acting as a strict punitive police force', 'Replacing all legal proclamations with personal discretion', 'Eliminating the need for strategic planning at executive level'],
    correctIndex: 0,
    explanation: 'Role-modeling leadership bridges executive policy and frontline delivery by demonstrating the behavioral standards expected of all civil servants through consistent personal example.'
  },
  {
    id: '8d14b6f0-92df-4bf1-9987-0a9035298f70',
    questionText: 'What sub-competency under role-modeling leadership involves remaining calm and solution-oriented during crises?',
    options: ['Resilience, Composure, and Steadfastness Under Pressure', 'Authoritarian Command and Control', 'Reactive Operational Firefighting', 'Bureaucratic rule-enforcement without discretion'],
    correctIndex: 0,
    explanation: 'Resilience, Composure, and Steadfastness Under Pressure is the sub-competency that equips leaders to remain calm, rational, and solution-focused during institutional crises.'
  },
  {
    id: 'ea371d43-fb6e-4923-8f8a-fe6f7dfcb97f',
    questionText: 'What is the functional difference between information-sharing and strategic influencing in professional communication?',
    options: ['Information-sharing is neutral data transmission, whereas strategic influencing shapes attitudes, aligns interests, and mobilizes action', 'Information-sharing is illegal, while influencing is mandatory', 'Strategic influencing involves sending blank emails', 'Information-sharing requires hierarchical approval, while influencing does not'],
    correctIndex: 0,
    explanation: 'Information-sharing transmits data neutrally, while strategic influencing goes further by shaping attitudes, aligning stakeholder interests, and mobilizing commitment to a course of action.'
  },
  {
    id: '32246a47-6599-49e9-a685-2b91617781a1',
    questionText: 'What does empathic listening involve during professional interactions?',
    options: ["Tuning into underlying emotions, frustrations, and anxieties of the speaker", 'Planning your next interruption while the other person speaks', "Ignoring the speaker's emotional state entirely", 'Responding immediately without allowing the speaker to finish'],
    correctIndex: 0,
    explanation: 'Empathic listening requires consciously tuning into the underlying emotions, frustrations, and anxieties of the speaker to build genuine understanding and trust.'
  },
  {
    id: 'b7f569a7-88d8-4f29-a1f7-009b382ad342',
    questionText: 'What core outcome does active collaborative synergy produce in teamwork?',
    options: ['Outcomes far greater than the sum of individual efforts (1+1 equals more than 2)', 'Increased departmental isolation and turf wars', 'Slower project delivery and duplicated administrative efforts', 'Reduced accountability through diffused responsibility'],
    correctIndex: 0,
    explanation: 'Active collaborative synergy produces collective outcomes that significantly exceed the sum of individual contributions, captured by the principle that united effort multiplies results.'
  },
  {
    id: '8bdfb792-ac16-4176-8e16-6d4e0e77ed75',
    questionText: 'What is emotional self-control defined as under emotional intelligence?',
    options: ['The ability to keep impulsive feelings and disruptive emotions in check, preventing reactive outbursts during high-pressure meetings', 'The technical skill to program artificial intelligence databases', 'The authority to command obedience through fear', 'The practice of suppressing all emotions to project a robotic image'],
    correctIndex: 0,
    explanation: 'Emotional self-control is the EI competency that prevents impulsive reactions and disruptive outbursts during high-pressure situations, maintaining professional composure and judgment.'
  },
  {
    id: 'd0f74e92-0fb0-4e04-b341-da87f77c6aa0',
    questionText: 'How does emotional intelligence assist in ethical governance?',
    options: ['By providing the personal courage and self-confidence to withstand undue political, peer, or hierarchical pressure to bend rules', 'By replacing all anti-corruption laws with personal feelings', 'By allowing employees to ignore compliance audits', 'By eliminating the need for institutional oversight mechanisms'],
    correctIndex: 0,
    explanation: 'High EI gives civil servants the internal fortitude to resist pressures to compromise ethical standards, reinforcing integrity even when supervisors, peers, or political actors push back.'
  },
  {
    id: '7e4c8578-9c4f-42f4-b849-a7dcc359f4d5',
    questionText: 'What dimension of ethics focuses on an internalized, personal commitment to public service values and national growth objectives?',
    options: ['Compliance-based ethics', 'Value-based ethics', 'Relational ethics', 'Contractual ethics'],
    correctIndex: 1,
    explanation: 'Value-based ethics centers on an internalized, self-motivated commitment to public service values — doing the right thing because it aligns with professional ethos, not merely because rules require it.'
  },
  {
    id: '8ba3e40b-ee7a-4670-abc6-b3dfa6ab6ffa',
    questionText: 'What does relational ethics center on in everyday workplace interactions?',
    options: ['Mutual respect for diversity, human dignity, and strict professional boundaries', 'Strict adherence to formal rules and anti-corruption laws', 'Financial gain and commercial lobbying', 'Authoritarian enforcement of institutional hierarchies'],
    correctIndex: 0,
    explanation: 'Relational ethics governs interpersonal conduct by centering on mutual respect for diversity, human dignity, and maintaining clear professional boundaries in every workplace interaction.'
  },
  {
    id: '1c2b31ca-e069-4320-a690-a62c429be06e',
    questionText: 'What is the difference between demographic diversity and behavioral inclusivity?',
    options: ["Demographic diversity is quantitative (who is in the room), while behavioral inclusivity is qualitative (whether everyone's voice is leveraged and respected)", 'Demographic diversity is illegal, while inclusivity is optional', 'There is no structural distinction between the two concepts', 'Demographic diversity applies only to gender, while inclusivity applies only to ethnicity'],
    correctIndex: 0,
    explanation: "Demographic diversity counts representation (who is present), while behavioral inclusivity ensures that every individual's perspective is actively heard, valued, and incorporated into decisions."
  },
  {
    id: '5ce63872-95d7-4ef7-a469-0cf6cb1e461b',
    questionText: 'How does behavioral inclusivity impact marginalized staff members?',
    options: ['It ensures they feel genuinely welcomed, heard, valued, and empowered to contribute', 'It isolates them in separate departmental offices', 'It forces them to abandon their cultural background', 'It limits their advancement opportunities to entry-level positions'],
    correctIndex: 0,
    explanation: 'Behavioral inclusivity actively creates an environment where marginalized staff feel welcomed, heard, valued, and empowered — unlocking their full professional potential for the institution.'
  },
  {
    id: 'f1e8b74f-078a-4982-b47c-e21faab449b1',
    questionText: 'What competency element combines technical functional mastery with an active, passionate drive and task ownership?',
    options: ['Proficiency and Engagement', 'Passive Clock-Watching', 'Bureaucratic Indifference', 'Administrative Compliance Management'],
    correctIndex: 0,
    explanation: "Proficiency and Engagement fuses technical expertise with genuine enthusiasm and ownership — producing civil servants who are both highly capable and deeply committed to their institutional mission."
  },
  {
    id: 'f3f37d22-c19c-4fcb-8051-c698ce2bd92c',
    questionText: 'What does servanthood represent as a foundational public service competency?',
    options: ['The professional mindset and moral commitment of putting citizens first, viewing public office as a sacred duty', 'The administrative right to demand unnecessary delays', 'The process of collecting government taxes through intimidation', 'Authoritarian command over subordinate employees'],
    correctIndex: 0,
    explanation: 'Servanthood transforms the concept of public office into a sacred duty — compelling civil servants to prioritize citizen needs above personal convenience, status, or institutional inertia.'
  },
  {
    id: 'e892313e-50b6-4f42-b971-9257d3ff82bd',
    questionText: 'What is the purpose of establishing Citizen Charter frameworks?',
    options: ['To publish explicit, easily accessible commitments detailing service requirements, processing times, fees, and citizen rights', 'To hide processing delays from oversight bodies', 'To punish employees who take leave', 'To restrict access to public services based on residency'],
    correctIndex: 0,
    explanation: 'Citizen Charters hold public institutions accountable by publishing clear, accessible commitments on service standards, processing times, fees, and the rights of every citizen.'
  },
  {
    id: '18c0b568-f742-42ad-a8ff-14208f70f6ef',
    questionText: 'How does active priority management differ from passive clock-watching?',
    options: ['Active priority management focuses on value generation, strategic sequencing, and output velocity rather than mere temporal compliance', 'Clock-watching is much more efficient for complex projects', 'Priority management requires no scheduling tools', 'Both approaches produce identical organizational outcomes'],
    correctIndex: 0,
    explanation: 'Active priority management is outcome-driven — it sequences tasks by strategic importance and output speed — whereas passive clock-watching merely tracks time without regard for value creation.'
  },
  {
    id: '21c80b81-4e5d-4e4b-a876-ddb63928ddd9',
    questionText: "What category of activity is legally necessary for compliance or reporting but does not directly change the citizen's service experience?",
    options: ['Value-Adding activities', 'Business-Non-Value-Adding activities', 'Non-Value-Adding / Wasteful activities', 'Strategic-Priority activities'],
    correctIndex: 1,
    explanation: 'Business-Non-Value-Adding (BNVA) activities are necessary for regulatory compliance and institutional reporting, but they do not directly improve the citizen\'s service experience — they are tolerated, not eliminated.'
  },
  {
    id: '53f8fd4b-42e5-470f-b878-eb0a0334c954',
    questionText: 'What does carrying out responsibility represent as a foundational competency?',
    options: ['The unwavering commitment of a public servant to fulfill assigned duties accurately, on schedule, and in alignment with targets', 'Doing the bare minimum required only when watched', 'Passing difficult files to adjacent directorates', 'Deferring all decisions to senior management regardless of urgency'],
    correctIndex: 0,
    explanation: 'Carrying out responsibility means a civil servant reliably and proactively fulfills every assigned duty with precision, on schedule, and in clear alignment with institutional performance targets.'
  },
  {
    id: 'd6d46197-45de-4e57-b793-105f2d56841f',
    questionText: 'How does leadership extend beyond hierarchical rank in the behavioral competency framework?',
    options: ['It is an action-oriented mindset defined by personal accountability, initiative, and lifting team capability regardless of formal title', 'It requires holding an executive office to function', 'It means refusing all supervisory instructions', 'It is exclusively reserved for directors and permanent secretaries'],
    correctIndex: 0,
    explanation: 'True leadership is a mindset, not a title — anyone who exercises initiative, takes accountability, and elevates those around them is demonstrating leadership regardless of their position in the hierarchy.'
  },
  {
    id: '632acedf-6a3b-448b-8fa2-65446d337421',
    questionText: 'What is the fundamental difference between authoritarian command-and-control and visionary leadership?',
    options: ['Command-and-control relies on hierarchy, fear, and rigid oversight, while visionary leadership relies on shared purpose, trust, and autonomy', 'Command-and-control fosters extreme workplace innovation', 'Visionary leadership punishes all mistakes severely', 'Both approaches produce the same long-term organizational outcomes'],
    correctIndex: 0,
    explanation: 'Command-and-control enforces compliance through fear and rigid oversight, while visionary leadership inspires voluntary commitment through a shared purpose, mutual trust, and delegated autonomy.'
  },
  {
    id: '0449b891-23b6-46c2-a871-e5152b2a77bc',
    questionText: 'What does situational leadership require managers to do?',
    options: ['Tailor management styles and behavioral support to match the specific readiness, maturity, and developmental needs of staff', 'Enforce a rigid one-size-fits-all rule across all bureaus', 'Eliminate the need for any supervisory guidance', 'Apply the same leadership directive regardless of context or urgency'],
    correctIndex: 0,
    explanation: 'Situational leadership demands that managers continuously adapt their style — directive or participatory — based on the individual readiness level and developmental needs of each team member.'
  },
  {
    id: '263be905-df30-4f4c-aace-1dc6e886de4d',
    questionText: 'What is the primary purpose of 360-degree feedback loops?',
    options: ['To gather structured performance evaluations from supervisors, peers, and direct reports to eliminate blind spots and foster growth', 'To allow anonymous attacks on colleagues', 'To prove that leaders are infallible', 'To automate all executive decision-making processes'],
    correctIndex: 0,
    explanation: '360-degree feedback collects structured performance input from supervisors, peers, and direct reports simultaneously, giving leaders a holistic picture of their blind spots and growth areas.'
  },
  {
    id: '430a0858-3a1e-4163-a068-35cabd7f2263',
    questionText: 'What three pillars organize the 15 core behavioral competency elements?',
    options: ['Work, Human, and Result', 'Strategic, Tactical, and Operational', 'Individual, Team, and Organizational', 'Ethics, Execution, and Leadership'],
    correctIndex: 0,
    explanation: 'The behavioral competency framework is organized around three pillars — Work (strategic alignment), Human (interpersonal excellence), and Result (citizen-centric delivery and accountability).'
  },
  {
    id: '604c9192-b326-42b1-9fb2-e3d6da60ff11',
    questionText: 'What is the primary focus of the Human pillar in the behavioral competency framework?',
    options: ['Cognitive maturity, enhanced communication, robust collaboration, uncompromising ethics, and diversity', 'Aligning daily responsibilities with institutional strategies', 'Establishing systems that deliver high-impact services to citizens', 'Managing physical office infrastructure and procurement cycles'],
    correctIndex: 0,
    explanation: 'The Human pillar develops the interpersonal and ethical dimensions of civil servants: cognitive maturity, communication excellence, collaborative capacity, uncompromising ethics, and inclusive diversity.'
  },
  {
    id: '6fdbbc6a-78f2-46ae-917f-7c5bcd0c0a45',
    questionText: 'What does the Result pillar center on within public service administration?',
    options: ['Public servanthood, effective time management, rigorous discharge of responsibilities, and leadership artistry', 'Fostering creative ideation and digital transformation', 'Conducting PESTEL and SWOT market analyses', 'Managing physical office infrastructure'],
    correctIndex: 0,
    explanation: 'The Result pillar focuses on citizen-centric outcomes: putting citizens first (servanthood), managing time efficiently, fulfilling responsibilities with precision, and demonstrating leadership at every level.'
  },
  {
    id: '1daa9aa2-e812-4d99-a46b-c6d7614ee11d',
    questionText: 'How does environmental scanning assist strategic professionals in public administration?',
    options: ['By actively monitoring the external macro-environment (demographics, technology, economics) to anticipate shifts before they become crises', 'By ignoring external market trends entirely', 'By focusing exclusively on daily administrative memos', 'By hiding regulatory risks from executive leadership'],
    correctIndex: 0,
    explanation: 'Environmental scanning continuously monitors external macro-environmental forces — demographic, technological, economic, political — enabling institutions to anticipate disruptions and respond proactively.'
  },
  {
    id: '99a87ac5-4114-48b5-8101-f75edf167b61',
    questionText: 'What is the function of strategic planning and resource alignment?',
    options: ['Translating multi-year national strategies into phased institutional milestones and optimized resource allocation', 'Distributing budgets equally without cost-benefit analysis', 'Creating administrative bottlenecks and redundant spending', 'Eliminating the need for key performance indicators'],
    correctIndex: 0,
    explanation: 'Strategic planning and resource alignment convert long-range national visions into concrete institutional milestones with matching resource commitments, ensuring execution tracks intended outcomes.'
  },
  {
    id: 'fad493d5-4630-4ce6-ab2a-5fd59fa3ac7e',
    questionText: 'What behavioral indicator demonstrates high strategic thinking in a civil servant?',
    options: ['Regularly framing daily duties within the context of institutional strategic plans and relying on data-driven analysis', 'Constantly putting out fires and handling issues purely as they land on the desk', 'Working in isolated silos while ignoring adjacent units', 'Dismissing emerging technological trends as irrelevant to current operations'],
    correctIndex: 0,
    explanation: 'High strategic thinking is evidenced by routinely connecting daily tasks to institutional strategic plans and applying data-driven analysis rather than reacting impulsively to immediate pressures.'
  },
  {
    id: '0ad78a15-5f47-49e6-9840-2059ccaf12d5',
    questionText: 'What is the purpose of scenario planning and horizon scanning?',
    options: ['Building multiple plausible future operating scenarios to test policy resilience against diverse socio-economic futures', 'Predicting exact future events with 100% supernatural certainty', 'Halting all institutional operations until certainty is achieved', 'Dismissing emerging technological trends from strategic analysis'],
    correctIndex: 0,
    explanation: 'Scenario planning and horizon scanning stress-test institutional strategies against multiple plausible futures, ensuring policies remain resilient regardless of which socio-economic trajectory unfolds.'
  },
  {
    id: '77be566e-5dd9-4164-b8d2-61eaaaeba6fb',
    questionText: 'What does Level 2 (Meets Expectations) represent on the strategic thinking behavioral anchor scale?',
    options: ['Connects daily responsibilities to goals, utilizes basic tools like SWOT, and plans projects with clear milestones', 'Focuses solely on immediate daily firefighting and ignores vision', 'Demonstrates advanced future foresight and builds long-term roadmaps', 'Relies purely on guesswork rather than data or evidence'],
    correctIndex: 0,
    explanation: 'Level 2 on the strategic thinking scale represents competent professionals who link their work to institutional goals, use basic analytical tools like SWOT, and plan with structured milestones.'
  },
  {
    id: 'd177f8e4-feae-44db-a85f-17b9f6b5bb35',
    questionText: 'How does innovation overcome bureaucratic inertia in public institutions?',
    options: ['By empowering civil servants to critically evaluate redundant sign-off layers and legacy administrative routines', 'By encouraging employees to break all laws secretly', 'By eliminating standard operating procedures entirely', 'By increasing the number of physical approval tiers required'],
    correctIndex: 0,
    explanation: 'Innovation counters bureaucratic inertia by giving civil servants the mandate and tools to challenge outdated approval layers and redesign legacy routines that no longer add citizen value.'
  },
  {
    id: 'a422b7b9-4b89-4d38-b01c-cf4ba0dd9fb0',
    questionText: 'What is the impact of high innovation competency on individual professional growth?',
    options: ['Enhanced problem-solving autonomy and standing out to executive leadership for promotions', 'Forced demotion and loss of decision-making authority', 'Increased risk of administrative penalties for creativity', 'Isolation from key institutional projects and committees'],
    correctIndex: 0,
    explanation: "High innovation competency elevates an individual's professional standing by demonstrating autonomous problem-solving capability, which consistently attracts executive attention and advancement opportunities."
  },
  {
    id: '189b266a-e15c-40d3-9336-2e3cc95e61d8',
    questionText: 'What does low innovation competency manifest as in the workplace?',
    options: ['Rigid adherence to outdated routines, resistance to technological change, and fear of experimentation', 'Proactive digital workflow design and process re-engineering', 'Safe-to-fail experimentation and continuous improvement', 'Successful pilot project incubation across multiple directorates'],
    correctIndex: 0,
    explanation: 'Low innovation competency shows up as an inability to challenge old routines, resistance to digital adoption, and a risk-averse mindset that fears experimentation and novel approaches.'
  },
  {
    id: '41f798c7-ad1c-40ae-98f7-cb08cb90add4',
    questionText: 'What is the purpose of enterprise support hubs and innovation grants?',
    options: ['To help local startups and small-and-medium enterprises scale high-value products and services', 'To impose heavy compliance taxes on commercial operators', 'To shut down academic and public research institutions', 'To eliminate financial market liquidity across the economy'],
    correctIndex: 0,
    explanation: 'Enterprise support hubs and innovation grants provide SMEs and startups with the capital, mentorship, and networks needed to scale viable products into market-ready commercial offerings.'
  },
  {
    id: 'f3f18b46-12bd-4887-ad38-5e331dbb3ac6',
    questionText: 'What does market building require public institutions to prioritize regarding national economic development?',
    options: ['Generating widespread employment opportunities and supporting high-impact private sectors', 'Creating state monopolies that eliminate private enterprise', 'Increasing administrative red tape for business registrations', 'Restricting foreign direct investment completely'],
    correctIndex: 0,
    explanation: 'Market building mandates that public institutions generate employment, enable private sector growth, and build the regulatory environments that attract domestic and international investment.'
  },
  {
    id: 'e2ff7a7a-7787-405d-83e5-78ae85ba8026',
    questionText: 'How do public-private dialogue (PPD) forums support market building?',
    options: ['By establishing regular consultative platforms where regulators and entrepreneurs co-create solutions and review draft policies', 'By giving corporations total control over government legislation', 'By eliminating all consumer protection safeguards', 'By restricting market access to large multinational corporations only'],
    correctIndex: 0,
    explanation: 'PPD forums create structured, ongoing dialogue channels between government regulators and business stakeholders, enabling collaborative policy-making that balances growth enablement with regulatory integrity.'
  },
  {
    id: '036b246c-76ee-4fdc-9746-ea141f537231',
    questionText: 'What is the impact of role-modeling leadership on employee retention?',
    options: ['Lowering workplace friction, enhancing job satisfaction, and reducing costly employee turnover', 'Forcing skilled professionals to resign immediately', 'Increasing inter-office conflict and absenteeism', 'Increasing regulatory friction and licensing costs for staff'],
    correctIndex: 0,
    explanation: 'Role-modeling leadership creates psychologically safe and professionally rewarding environments that retain top talent by reducing friction, increasing job satisfaction, and building institutional loyalty.'
  },
  {
    id: 'b019097a-9715-410b-8921-7fc7753ec4c3',
    questionText: 'How does a role-model leader ensure regulatory compliance within the institution?',
    options: ['By operating strictly within civil service laws, institutional guidelines, and anti-corruption frameworks', 'By granting exemptions to personal acquaintances', 'By ignoring statutory rules to speed up task delivery', 'By hiding administrative procedures from oversight bodies'],
    correctIndex: 0,
    explanation: 'A role-model leader upholds regulatory compliance by personally operating within civil service laws, institutional guidelines, and anti-corruption frameworks — and expecting the same from their team.'
  },
  {
    id: '7a6467df-bc92-4c83-8f4d-9348bd8ed019',
    questionText: 'What sub-competency under communication involves designing well-organized official letters and operational reports?',
    options: ['Structured Reporting', 'Monologic Broadcasting', 'Authoritarian Coercion', 'Ambiguous Messaging'],
    correctIndex: 0,
    explanation: 'Structured Reporting is the communication sub-competency that focuses on crafting well-organized, logically flowing official correspondence and operational reports that inform and guide decision-making.'
  },
  {
    id: '74e22e68-b0d2-4598-83a9-3f8d6bccf637',
    questionText: 'What is the effect of transparent communication on public trust?',
    options: ['Clarifying processes, eliminating suspicions of corruption, and strengthening institutional legitimacy', 'Increasing public frustration and confusion', 'Creating hidden administrative hurdles', 'Zero impact on public perception of government institutions'],
    correctIndex: 0,
    explanation: 'Transparent communication demystifies government processes, dispels corruption suspicions, and builds the institutional legitimacy that citizens need to trust and engage with public services.'
  },
  {
    id: 'b6f5092a-744d-4e6a-a5ea-e26b2fb57ebd',
    questionText: 'What does low influencing skill manifest as during professional meetings?',
    options: ['Monopolizing discussions, interrupting peers, using ambiguous jargon, and relying on authoritative coercion', 'Active listening, empathic validation, and win-win negotiation', 'Encouraging junior staff to share unique viewpoints', 'Structuring logical arguments around shared institutional goals'],
    correctIndex: 0,
    explanation: 'Low influencing skill produces counterproductive meeting behaviors: dominating conversations, interrupting colleagues, obscuring points with jargon, and resorting to authority rather than persuasion.'
  },
  {
    id: 'dd889a2d-121e-4d54-bdd0-e32d6b3caa90',
    questionText: 'How does emotional intelligence support crisis management in public institutions?',
    options: ['High-EI leaders maintain composure, preventing panic and projecting stability across the workforce', 'By broadcasting panic and shifting blame downward', 'By locking office doors and ignoring operational emergencies', 'Emotional intelligence hinders crisis response by causing over-analysis'],
    correctIndex: 0,
    explanation: 'In crises, high-EI leaders prevent institutional panic by projecting calm confidence, maintaining rational judgment, and stabilizing the emotional climate of the entire organization.'
  },
  {
    id: 'f33f8acf-c2fd-437f-a19a-59f3f9fadcee',
    questionText: 'What does emotional self-awareness involve as a sub-competency of emotional intelligence?',
    options: ["Accurately recognizing one's emotions and understanding how they influence behavior before acting", 'Hiding all emotional reactions from colleagues and clients', 'Asserting social dominance over departmental peers', 'Relying entirely on intuition during compliance audits'],
    correctIndex: 0,
    explanation: "Emotional self-awareness is the foundational EI skill of accurately identifying one's own emotional states and understanding how those states shape behavior, communication, and decision-making."
  },
  {
    id: '2f871ee8-9fca-4d4a-99d6-cc1efd3eb75b',
    questionText: 'What is the purpose of compliance-based ethics in civil service?',
    options: ['Ensuring civil servants execute duties squarely within formal rules, anti-corruption laws, and regulatory guidelines', 'Allowing employees to invent new compliance rules daily', 'Replacing legal statutes with personal opinions', 'Negotiating commercial contracts with private vendors'],
    correctIndex: 0,
    explanation: 'Compliance-based ethics anchors civil servant conduct within the formal legal and regulatory framework — anti-corruption laws, institutional proclamations, and statutory guidelines — ensuring rule-based integrity.'
  },
  {
    id: 'afa40c8d-b01a-4f57-a0a4-68b3bfa7aaca',
    questionText: 'What does cultural humility require professionals to examine?',
    options: ['Their own unconscious stereotypes, historical assumptions, and cultural blind spots', 'The personal bank accounts of minority staff', 'The political affiliations of public service recipients', 'Technical software programming codes used by competing agencies'],
    correctIndex: 0,
    explanation: 'Cultural humility compels professionals to rigorously examine and challenge their own unconscious biases, stereotypes, and assumptions that may limit their ability to serve diverse populations equitably.'
  },
  {
    id: '588fee24-29bc-4730-a4d6-43ef6259c7fd',
    questionText: 'What is the purpose of blind recruitment and meritocratic hiring in public institutions?',
    options: ['Standardizing hiring to focus purely on professional competency and objective metrics, minimizing subjective bias', 'Selecting candidates based on personal friendships and regional ties', 'Eliminating all professional examinations from the recruitment process', 'Promoting staff based strictly on seniority regardless of competency'],
    correctIndex: 0,
    explanation: 'Blind recruitment and meritocratic hiring remove subjective bias from selection decisions, ensuring that candidates are evaluated solely on professional competency, qualifications, and objective performance metrics.'
  },
  {
    id: 'a5384daa-893e-4e68-b6ae-dd49bcb23278',
    questionText: 'What does proficiency and engagement require in terms of capability and motivation?',
    options: ["Bridging functional qualifications and problem-solving capacity with the zeal, initiative, and drive to deliver results", 'Separating technical skills completely from work enthusiasm', 'Prioritizing personal career advancement over institutional goals', 'Relying on top-down administrative compulsion to drive performance'],
    correctIndex: 0,
    explanation: "Proficiency and Engagement demands the integration of technical mastery with authentic motivation — a civil servant must be both highly skilled AND genuinely driven to serve the institution's mission."
  },
  {
    id: 'f3ab5e96-1076-4800-bf93-2972d8136e29',
    questionText: 'How does public stewardship eliminate bureaucratic arrogance?',
    options: ['By replacing elitism with profound humility, respect, and treating public office as a sacred duty to serve citizens', 'By granting administrative staff special status symbols', 'By increasing the number of physical approval sign-offs', 'By placing bureaucratic arrogance within the realm of acceptable professional culture'],
    correctIndex: 0,
    explanation: 'Public stewardship eliminates bureaucratic arrogance by reframing authority as service — instilling humility, respect, and a sense of sacred duty that transforms how civil servants relate to the public.'
  },
  {
    id: 'ce92b615-f7a9-4cf2-a3ab-39e3af4d7b72',
    questionText: 'What is the purpose of real-time SLA tracking dashboards in public service management?',
    options: ['Allowing agency leadership to instantly identify processing bottlenecks and ensure requests are resolved within promised timeframes', 'Hiding processing delays from oversight bodies', 'Punishing employees who take lunch breaks', 'Bureaucratic arrogance cannot be eliminated through dashboards alone'],
    correctIndex: 0,
    explanation: 'Real-time SLA dashboards give leaders instant visibility into processing bottlenecks, enabling proactive interventions that ensure service requests are consistently resolved within committed timeframes.'
  },
  {
    id: '5aa04bd2-3fbe-4c0b-8a1c-974c47175edf',
    questionText: 'What does time-blocking involve as a scheduling strategy?',
    options: ['Reserving dedicated, uninterrupted blocks of the workday exclusively for deep cognitive tasks', 'Scheduling continuous meetings that prevent deep concentration', 'Eliminating all digital calendars and deadlines', 'Tracking personal internet usage of staff throughout the day'],
    correctIndex: 0,
    explanation: 'Time-blocking is a scheduling discipline that carves out uninterrupted segments of the workday for high-concentration cognitive tasks, protecting them from the interruptions that fragment deep work.'
  },
  {
    id: '315082d3-4047-4a92-b5ba-59b7cae091e0',
    questionText: 'What is the benefit of task-batching in daily administration?',
    options: ['Grouping similar low-cognitive duties into specific time windows to prevent constant context-switching', 'Spreading routine tasks randomly throughout the entire day', 'Delegating all administrative duties to external interns', 'Encouraging multi-tasking across overlapping high-priority projects'],
    correctIndex: 0,
    explanation: 'Task-batching clusters similar routine activities into dedicated time windows, eliminating the cognitive switching costs that arise when moving constantly between different types of work.'
  },
  {
    id: 'c79a5425-410a-46db-b21a-c84f3a6e8334',
    questionText: 'What is the core difference between value-adding and non-value-adding activities?',
    options: ['Value-adding activities transform inputs into outcomes citizens value, while non-value-adding activities create waste and delay', 'Value-adding activities are illegal, while non-value-adding tasks are mandatory', 'Non-value-adding tasks require high cognitive skill', 'There is no structural difference between the two categories'],
    correctIndex: 0,
    explanation: 'Value-adding activities directly transform inputs into services or outcomes that citizens value; non-value-adding activities consume resources — time, money, labor — without producing citizen benefit.'
  },
  {
    id: 'cb228de8-a899-4f24-bad5-c3e56822b864',
    questionText: 'What does AS-IS vs. TO-BE process analysis evaluate?',
    options: ['Existing workflows (AS-IS) versus streamlined operational models (TO-BE) to strip away administrative clutter', 'Office physical space dimensions and furniture layout', 'Employee salary scales against private sector rates', 'Annual budgetary allocations across regional bureaus'],
    correctIndex: 0,
    explanation: 'AS-IS vs. TO-BE analysis maps current operational workflows and compares them against redesigned target-state models to identify and eliminate administrative waste, bottlenecks, and redundancy.'
  },
  {
    id: 'e41f3899-743a-481b-9306-ba082da5dc40',
    questionText: 'What is the role of individual performance plans (IPPs)?',
    options: ['Breaking down annual institutional targets into quarterly, monthly, and weekly personal milestones for clear execution line-of-sight', 'Hiding organizational objectives from frontline staff', 'Setting impossible quotas designed to cause failure', 'Replacing institutional strategic master plans entirely'],
    correctIndex: 0,
    explanation: 'IPPs translate macro institutional targets into granular personal milestones — quarterly, monthly, weekly — giving each employee a clear line-of-sight between their daily work and organizational strategy.'
  },
  {
    id: '4be26479-9b5a-4409-addf-999115c70137',
    questionText: 'What does high personal responsibility drive in organizational performance?',
    options: ['The achievement of institutional strategic plans, ensuring annual goals are met or exceeded', 'Widespread project delays and administrative backlogs', 'Increased need for micro-management and constant supervision', 'Zero impact on organizational productivity'],
    correctIndex: 0,
    explanation: 'When civil servants demonstrate high personal responsibility, institutional plans reliably achieve or surpass their targets because accountability is distributed to every level of the organization.'
  },
  {
    id: 'b8a7ace5-84db-48cc-b323-d7a5d2b73373',
    questionText: 'How does visionary leadership handle team accountability?',
    options: ['By protecting staff when honest mistakes happen while holding the unit accountable for overall performance and integrity', 'By blaming subordinates publicly for any project setback', 'By eliminating all performance metrics and evaluations', 'By relying on fear of reprisal to drive compliance'],
    correctIndex: 0,
    explanation: 'Visionary leadership balances psychological safety — protecting staff from fear of honest mistakes — with firm unit-level accountability for overall performance outcomes and ethical integrity.'
  },
  {
    id: '1e1c8027-dbc5-427d-9f22-82d9648f8018',
    questionText: 'What is the purpose of strategic delegation matrices (like RACI charts)?',
    options: ['Empowering lower tiers of management, freeing up executive bandwidth, and accelerating day-to-day approvals', 'Confusing employees regarding their reporting lines', 'Restricting all decision-making authority to the top executive', 'Tracking employee attendance hours for compliance reporting'],
    correctIndex: 0,
    explanation: 'RACI charts and strategic delegation matrices clarify who is Responsible, Accountable, Consulted, and Informed for each decision, distributing authority intelligently to accelerate institutional throughput.'
  },
  {
    id: '0cacf6ad-a703-419c-bc4e-541a265754d0',
    questionText: 'How do the three pillars (Work, Human, Result) integrate to form behavioral competencies?',
    options: ['Work aligns daily tasks with strategy, Human empowers collaboration and ethics, and Result ensures citizen-centric value and accountability', 'They operate as entirely independent, disconnected theories', 'Work replaces the need for Human and Result pillars', 'Result is the sole pillar governing all aspects of public administration'],
    correctIndex: 0,
    explanation: 'The three pillars are deeply interdependent: Work provides strategic alignment, Human provides relational and ethical capacity, and Result ensures that both ultimately deliver value to citizens.'
  },
  {
    id: '8f1ff864-3abf-4ef7-9721-2d15294c7c3f',
    questionText: 'What does environmental scanning prevent in public administration?',
    options: ['Being blindsided by emerging regulatory, political, or operational crises', 'Implementing digital government tools and automation', 'Aligning regional plans with national development agendas', 'Achieving institutional transparency and citizen trust'],
    correctIndex: 0,
    explanation: 'Environmental scanning prevents institutions from being caught off-guard by external shocks — political, regulatory, economic, or technological — by maintaining continuous situational awareness of the operating landscape.'
  },
  {
    id: '57432269-6501-44e9-a513-8bea2219e047',
    questionText: 'What is the purpose of conducting cost-benefit analyses during resource allocation?',
    options: ['Directing scarce public funds where they yield the greatest societal return and eliminating wasteful redundancy', 'Distributing budgets equally without evaluating project impact', 'Increasing administrative overhead across all directorates', 'Delaying project approvals indefinitely through extended review cycles'],
    correctIndex: 0,
    explanation: 'Cost-benefit analysis during resource allocation ensures that limited public funds are deployed to projects with the highest societal return on investment, eliminating duplication and waste.'
  },
  {
    id: '48ff9668-641e-43a3-aa8b-c495f06ea735',
    questionText: 'How does cross-sectoral coordination improve governance?',
    options: ['By encouraging ministries to view themselves as part of a single national machinery rather than competing fiefdoms', 'By creating departmental silos that isolate information', 'By doubling the number of government bureaus required', 'By eliminating federal oversight of regional units entirely'],
    correctIndex: 0,
    explanation: 'Cross-sectoral coordination replaces territorial, silo-based thinking with a unified-government mindset, enabling ministries to collaborate, share intelligence, and align on national priorities.'
  },
  {
    id: 'b7ef36e0-7ce7-4974-bab7-e869d9bcb3e5',
    questionText: 'What is the role of design thinking in modern public service?',
    options: ['Applying human-centered problem-solving steps (Empathize, Define, Ideate, Prototype, Test) to engineer tailored solutions', 'Forcing citizens to navigate complex paper-based forms', 'Eliminating all citizen feedback mechanisms', 'Design thinking only applies to private manufacturing, not public service'],
    correctIndex: 0,
    explanation: 'Design thinking reimagines public service delivery by placing the citizen experience at the center of problem-solving, using iterative steps — Empathize, Define, Ideate, Prototype, Test — to produce tailored solutions.'
  },
  {
    id: 'c92af527-7f71-4701-a300-41374b964941',
    questionText: 'What does constructive failure teach an innovative team?',
    options: ['Unsuccessful experiments provide vital data points and learning opportunities to refine future approaches', 'Failure proves that innovation is illegal and should be abandoned', 'Employees who experience failure must be demoted', 'Trials should never be conducted under any circumstances'],
    correctIndex: 0,
    explanation: 'Constructive failure reframes unsuccessful experiments as irreplaceable learning opportunities — each failed attempt generates data, insights, and refined hypotheses that make subsequent attempts more likely to succeed.'
  },
  {
    id: '63111c3b-1c5e-467a-b948-2e7a30e24e61',
    questionText: 'What is the outcome of robust public-private dialogue (PPD)?',
    options: ['Co-creating solutions, reviewing draft policies, and ensuring regulations foster growth rather than stifle commerce', 'Giving private corporations absolute control over state laws', 'Eliminating all labor and environmental standards', 'Increasing regulatory friction for startups and SMEs'],
    correctIndex: 0,
    explanation: 'Robust PPD produces policies that are co-designed by government and business, making regulations growth-enabling rather than stifling, while preserving consumer and labor protections.'
  },
  {
    id: 'af4c80eb-2c77-40fc-aa5d-06ef05236a90',
    questionText: 'How does a role-model leader handle underperformance within the team?',
    options: ['By executing necessary corrective actions while maintaining transparency and fair evaluations', 'By ignoring underperformance and pretending targets are met', 'By terminating staff instantly without feedback', 'By blaming adjacent directorates for the failure'],
    correctIndex: 0,
    explanation: 'Role-model leaders address underperformance with transparent, structured corrective action — providing honest feedback, clear expectations, and fair evaluation rather than avoidance or punitive overreaction.'
  },
  {
    id: '49acc995-38a4-400d-8c16-39d7b614dc9b',
    questionText: 'What does structured reporting achieve in official communications?',
    options: ['Logically presenting background information, findings, and actionable recommendations in official briefs', 'Hiding critical data behind dense bureaucratic jargon', 'Replacing formal policy documents with casual notes', 'Eliminating the need for written records in government operations'],
    correctIndex: 0,
    explanation: 'Structured reporting organizes information into a logical narrative — context, analysis, findings, recommendations — making official communications clear, actionable, and decision-ready for leadership.'
  },
  {
    id: '29f23b67-1a67-4d6e-9c33-ce5bc0b71556',
    questionText: 'Why is psychological safety critical for innovation in public institutions?',
    options: ['It allows staff to voice unorthodox ideas, point out flaws, and experiment without fear of social penalty', 'It enforces strict obedience to historical administrative routines', 'It punishes employees who propose alternative methods', 'It reduces overall workforce productivity through excessive tolerance'],
    correctIndex: 0,
    explanation: 'Psychological safety is the bedrock of innovation — without it, civil servants suppress creative ideas and avoid challenging flawed processes for fear of retaliation, ridicule, or career damage.'
  },
  {
    id: 'dca55b56-7282-4e3f-a982-1158b12a54b2',
    questionText: 'What is the impact of emotional self-regulation during institutional change?',
    options: ['Maintaining composure when procedures change, viewing transitions as opportunities for evolution rather than personal threats', 'Panicking and resisting all technological upgrades', 'Blaming upper management for structural re-engineering', 'Eliminating any engagement with change management processes'],
    correctIndex: 0,
    explanation: 'Emotional self-regulation during change enables civil servants to process disruption calmly, reframe transitions as growth opportunities, and sustain productivity rather than succumbing to resistance or panic.'
  },
  {
    id: '1dd0ab55-743a-4040-adff-1062ea77d1fc',
    questionText: 'What does compliance-based ethics rely on for enforcement?',
    options: ['Formal rules, anti-corruption laws, institutional proclamations, and regulatory guidelines', 'Internalized personal values and moral intuition', 'Informal peer pressure and office gossip', 'Complete absence of supervisory oversight'],
    correctIndex: 0,
    explanation: 'Compliance-based ethics is externally enforced through formal legislation, anti-corruption statutes, institutional proclamations, and regulatory guidelines — it governs conduct through rule-based accountability.'
  },
  {
    id: 'a3cfa741-917e-4104-bce7-e02335cc1f71',
    questionText: 'How do employee resource groups support diversity and inclusion?',
    options: ['By providing community support, open feedback channels, and targeted professional growth structures', 'By segregating offices by ethnic or regional background', 'By replacing formal performance appraisals entirely', 'By reducing overall workforce productivity'],
    correctIndex: 0,
    explanation: 'Employee resource groups build inclusion from within by creating community networks, open feedback channels, and targeted development pathways for underrepresented staff groups.'
  },
  {
    id: 'abb2963a-ab67-4896-ac99-440890c38cbf',
    questionText: 'What is the effect of continuous self-improvement on technical proficiency?',
    options: ['Updating competencies to match changing national service standards and eliminating professional obsolescence', 'Ensuring that skills remain frozen at entry-level standards', 'Eliminating the need for any teamwork or communication', 'Reducing the need for institutional training programs'],
    correctIndex: 0,
    explanation: 'Continuous self-improvement keeps technical proficiency current with evolving national service standards, preventing the skills stagnation that leads to professional obsolescence and reduced institutional value.'
  },
  {
    id: '329a217b-91ee-43b8-910e-9d7d2d3ed783',
    questionText: 'How does servanthood transform public perception of state institutions?',
    options: ['By healing the citizen-state divide, proving that public servants are honest, accessible, and committed to public welfare', 'By increasing public fear of administrative authority', 'By hiding government operations from citizen scrutiny', 'By reducing citizen access to government services'],
    correctIndex: 0,
    explanation: 'Servanthood rebuilds trust by repositioning the government-citizen relationship from one of authority and suspicion to one of genuine partnership, demonstrating honesty, accessibility, and commitment to public welfare.'
  },
  {
    id: '03223abb-7207-4fa6-bbc0-3dfc30c424c3',
    questionText: 'What is the purpose of the Eisenhower Matrix in time management?',
    options: ['Categorizing daily tasks based on urgency and importance to prioritize vital long-term projects', 'Tracking physical office attendance hours', 'Distributing workloads equally across all staff without priority criteria', 'Eliminating the need for digital calendars and scheduling tools'],
    correctIndex: 0,
    explanation: 'The Eisenhower Matrix sorts tasks into four quadrants by urgency and importance, helping professionals focus on high-impact strategic work while systematically managing or eliminating low-value tasks.'
  },
  {
    id: '25c265a8-15c5-49a6-8f2e-801392be3572',
    questionText: 'What is the impact of eliminating non-value-adding waste (Muda) from public service workflows?',
    options: ['Drastically reduced cycle times, lower operational costs, and maximized value for taxpayers', 'Increased administrative delays and higher public frustration', 'Slower institutional throughput and budget deficits', 'Elimination of the need for digital calendars and scheduling'],
    correctIndex: 0,
    explanation: 'Eliminating Muda (non-value-adding waste) compresses service cycle times, lowers operational costs, and redirects saved resources toward activities that directly benefit citizens and taxpayers.'
  },
  {
    id: '0b6ef597-0eee-4921-8b4f-29ccab8c1b91',
    questionText: 'What does reliable autonomous execution demonstrate in carrying out responsibility?',
    options: ['Taking complete charge of a task and delivering quality results without micro-management', 'Waiting for constant supervisory reminders before starting work', 'Abandoning projects midway through execution', 'Deflecting accountability when targets are missed'],
    correctIndex: 0,
    explanation: 'Reliable autonomous execution demonstrates full ownership — the civil servant initiates, manages, and completes tasks to quality standards entirely on their own initiative, without supervisory prodding.'
  },
  {
    id: '4ae98def-34ef-4509-9e8f-c867bc82bed5',
    questionText: 'How do peer-accountability check-ins support task execution?',
    options: ['Reviewing weekly progress, sharing workload tips, and keeping each other accountable for upcoming project deadlines', 'Enforcing strict authoritarian command and control', 'Replacing formal supervisory evaluations entirely', 'Reflecting accountability away when targets are missed'],
    correctIndex: 0,
    explanation: "Peer-accountability check-ins create horizontal accountability systems where colleagues support each other's progress, share practical insights, and collectively ensure that project deadlines are honored."
  },
  {
    id: '91cd46ed-1b11-4550-a174-669eec840473',
    questionText: 'What is the role of situational leadership during operational crises?',
    options: ['Shifting fluidly between directive crisis-response modes and participatory planning depending on urgency', 'Applying a rigid, unyielding management style regardless of situation', 'Abandoning all leadership responsibilities during emergencies', 'Delegating all crisis decisions to junior interns'],
    correctIndex: 0,
    explanation: 'Situational leadership during crises requires fluid style adaptation — moving from highly directive command during acute emergencies to collaborative, participatory approaches as urgency decreases and stability returns.'
  },
  {
    id: '662fb7cb-fb30-4c96-8f67-998a5703990a',
    questionText: 'How does transparent communication impact organizational change management?',
    options: ['Reducing employee resistance, fear of the unknown, and turnover by keeping staff informed across all tiers', 'Increasing employee panic and widespread resistance', 'Hiding structural reforms from affected departments', 'Delegating all crisis decisions to junior interns without context'],
    correctIndex: 0,
    explanation: 'Transparent communication during organizational change reduces the uncertainty that fuels resistance and turnover, by ensuring all staff understand the rationale, timeline, and implications of structural reforms.'
  },
  {
    id: '23f61835-4764-491b-8e82-28fbf3ddd577',
    questionText: 'What is the definition of behavioral competency units in public administration?',
    options: ['Competencies linked to psychology, mindset, and behavioral patterns required within public sector operations', 'Purely technical software coding standards', 'Temporary political campaign slogans', 'Financial auditing checklists for external procurement reviews'],
    correctIndex: 0,
    explanation: 'Behavioral competency units are the measurable psychological, mindset-based, and behavioral attributes that define professional effectiveness in public sector operations — distinct from purely technical skills.'
  },
  {
    id: '24d36e57-702c-48cf-85f5-8cd6fb079149',
    questionText: 'What is the purpose of strategic milestone tracking dashboards?',
    options: ['Displaying real-time progress toward long-term goals and alerting leadership immediately if execution drifts off course', 'Tracking employee coffee breaks and lunch hours', 'Hiding project delays from oversight bodies', 'Replacing annual performance appraisals with daily monitoring'],
    correctIndex: 0,
    explanation: 'Strategic milestone dashboards provide real-time execution visibility — enabling leaders to spot deviations from planned trajectories early enough to apply timely corrective interventions.'
  },
  {
    id: '08d874ae-3885-4450-aa6a-b89393b8a551',
    questionText: 'What is the effect of bureaucratic red tape on public institutions?',
    options: ['Entrenching inefficiency, creating sluggish procedural steps, and frustrating citizens', 'Accelerating public service delivery and digital transformation', 'Enhancing cross-sectoral coordination and transparency', 'Automatically eliminating administrative bottlenecks'],
    correctIndex: 0,
    explanation: 'Bureaucratic red tape entrenches inefficiency by multiplying redundant approval steps, slowing service delivery, and generating frustration among citizens who need timely, accessible government services.'
  },
  {
    id: '219e057a-f1a8-4685-87ad-15d55e6d1b87',
    questionText: 'How does market building address monopolies in the economy?',
    options: ['By introducing fair competition, fixing supply chain bottlenecks, and ensuring market liquidity', 'By creating absolute state monopolies across all sectors', 'By banning private enterprise entirely', 'By eliminating administrative bottlenecks automatically'],
    correctIndex: 0,
    explanation: 'Market building actively dismantles monopolistic structures by promoting fair competition, resolving supply chain inefficiencies, and ensuring adequate market liquidity that benefits consumers and investors.'
  },
  {
    id: '196f04c3-e6c2-4f22-9bd0-e1c6419f1baa',
    questionText: 'What does active listening prevent in professional communications?',
    options: ['Miscommunication, misunderstandings, and unnecessary interpersonal friction', 'Thorough data analysis and strategic planning', 'Constructive feedback reception and professional development', 'All forms of structured official reporting'],
    correctIndex: 0,
    explanation: 'Active listening eliminates the communication breakdowns that stem from inattention — preventing misunderstandings, resolving ambiguities in real-time, and reducing the interpersonal friction caused by poor listening.'
  },
  {
    id: '53a3e601-7b72-4bd4-b62e-353cc01a53bd',
    questionText: 'What is the role of empathy in customer service recovery?',
    options: ['De-escalating frustrated clients and transforming potential grievances into cooperative resolutions', 'Escalating minor disputes into formal legal battles', 'Ignoring citizen complaints until they disappear', 'Enforcing strict administrative penalties for non-compliance'],
    correctIndex: 0,
    explanation: "Empathy in service recovery disarms frustration by demonstrating genuine understanding of the citizen's experience, creating the emotional conditions needed to transform complaints into collaborative problem-solving."
  },
  {
    id: 'b0e01823-9343-4ddb-849f-e07555ca6056',
    questionText: 'What is the core principle of value-based ethics regarding supervision?',
    options: ['Doing the right thing because it aligns with professional ethos even when direct supervision is absent', 'Doing the right thing only when a supervisor is actively watching', 'Bending rules whenever supervision is lax', 'Enforcing strict administrative penalties regardless of context'],
    correctIndex: 0,
    explanation: 'Value-based ethics demands self-directed integrity — civil servants act rightly because they have internalized professional values, not merely because they fear oversight or disciplinary consequences.'
  },
  {
    id: 'b1b66c2b-6239-4fdb-b426-7f42983d7b17',
    questionText: 'What is the impact of proactive problem-solving in public servanthood?',
    options: ['Going the extra mile, taking personal ownership of citizen hurdles, and finding lawful ways to help clients', 'Passing difficult files to adjacent departments without helping', 'Hiding behind rigid bureaucratic red tape', 'Demanding unnecessary administrative delays to manage workload'],
    correctIndex: 0,
    explanation: 'Proactive problem-solving in servanthood means anticipating citizen needs, taking personal ownership of complex cases, and creatively applying legal tools to deliver results rather than deflecting or delaying.'
  },
  {
    id: 'e9b4b5de-0a05-4a99-b9b5-fe3f442f4e33',
    questionText: 'What does structural delegation achieve in executive leadership?',
    options: ['Empowering lower management tiers, freeing executive bandwidth, and accelerating daily service approvals', 'Confusing staff regarding their reporting hierarchy', 'Restricting all decision-making to the highest director', 'Demanding unnecessary administrative delays at every approval stage'],
    correctIndex: 0,
    explanation: 'Structural delegation empowers middle and frontline managers to make routine decisions independently, freeing executives to focus on strategic priorities and dramatically accelerating institutional throughput.'
  },
  {
    id: '6c515ada-1ea1-499b-a75c-b0712041d94c',
    questionText: 'How does the integration of strategic thinking, innovation, and market building drive public sector excellence?',
    options: ['By aligning daily actions with national vision, overcoming inertia, and building vibrant economic environments', 'By increasing administrative paperwork and bureaucracy', 'By centralizing all power in a single bureaucratic desk', 'By eliminating all laws governing public administration'],
    correctIndex: 0,
    explanation: 'The three work-pillar competencies reinforce each other: Strategic Thinking aligns effort with national goals, Innovation overcomes institutional inertia, and Market Building converts that vision into tangible economic vitality.'
  }
];

async function main() {
  const client = await pool.connect();
  const now = new Date().toISOString();

  // Find the subject ID for this exam via the template slug
  const templateRes = await client.query(
    'SELECT "subjectId" FROM "ExamTemplate" WHERE slug = $1',
    [TEMPLATE_SLUG]
  );

  if (!templateRes.rows[0]) {
    console.error(`Template not found: ${TEMPLATE_SLUG}`);
    client.release();
    await pool.end();
    return;
  }

  const subjectId = templateRes.rows[0].subjectId;
  console.log(`Found subject ID: ${subjectId}`);

  let updated = 0, notFound = 0;

  try {
    await client.query('BEGIN');

    for (const q of FIXED_QUESTIONS) {
      const res = await client.query(
        `UPDATE "Question"
         SET "questionText" = $1,
             options = $2,
             "correctOptionIndices" = $3,
             explanation = $4,
             "updatedAt" = $5
         WHERE id = $6 AND "subjectId" = $7`,
        [
          q.questionText,
          JSON.stringify(q.options),
          JSON.stringify([q.correctIndex]),
          q.explanation,
          now,
          q.id,
          subjectId
        ]
      );
      if (res.rowCount === 1) {
        updated++;
      } else {
        // Try without subjectId filter (in case IDs exist but subjectId differs)
        const res2 = await client.query(
          `UPDATE "Question"
           SET "questionText" = $1,
               options = $2,
               "correctOptionIndices" = $3,
               explanation = $4,
               "updatedAt" = $5
           WHERE id = $6`,
          [q.questionText, JSON.stringify(q.options), JSON.stringify([q.correctIndex]), q.explanation, now, q.id]
        );
        if (res2.rowCount === 1) {
          updated++;
        } else {
          console.warn(`  ⚠ Not found in PostgreSQL: ${q.id}`);
          notFound++;
        }
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ PostgreSQL: Fixed ${updated} questions`);
    if (notFound > 0) console.warn(`⚠ ${notFound} questions not found`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
