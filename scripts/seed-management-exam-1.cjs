const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');

const rawQuestions = `What is the primary focus of the Value-Adding Work competency regarding taxpayer funds?
A) Making taxpayer funds effective in service delivery and ensuring economic value through proportional services
B) Spending entire budget allocations regardless of public utility
C) Increasing non-value-adding administrative layers
D) Reducing public sector salaries to accumulate state reserves

How does value-adding work define services from the citizen's perspective?
A) As administrative burdens that must be endured
B) As services that create real value and worth from the citizen's perspective
C) As optional extras that carry no official weight
D) As confidential state documents hidden from public review

What outcome must superior, high-quality results achieve under value-adding work?
A) Achieving results in a shorter time and at a lower cost
B) Taking maximum time while using unlimited resources
C) Relying entirely on paper-based filing systems
D) Eliminating the need for operational policies

What role do agreed operational policies play in value-adding task execution?
A) Tasks must be executed in accordance with agreed operational policies
B) Policies can be ignored whenever processing speeds are slow
C) Policies serve only as decorative guidelines for management
D) Policies replace the need for citizen-centric service design

What must be systematically identified and revised through study under value-adding competency?
A) Obsolete laws, policies, and procedures
B) Successful digital software platforms
C) High-performing employee work schedules
D) Citizen feedback ratings

What core principle involves maximizing taxpayer resources through frugal and impactful execution?
A) Maximizing citizen utility and economic efficiency
B) Maximizing procedural red tape and administrative delay
C) Maximizing non-essential paperwork tiers
D) Eliminating all public service accountability

What does "Muda" refer to in the context of value-adding work?
A) Eliminating waste and non-value-adding administrative steps
B) Increasing the volume of manual signatures required
C) Expanding office physical workspace dimensions
D) Hiring additional redundant administrative personnel

What balance must be struck regarding resource-to-output ratios in value-adding work?
A) Achieving higher throughput, quality, and speed with minimal resource consumption
B) Consuming maximum resources to produce minimal service outputs
C) Balancing slow processing speeds with high financial expenses
D) Eliminating performance metrics entirely

Which category of activity directly transforms input into services that citizens recognize, value, and benefit from?
A) Value-Adding activities
B) Business-Non-Value-Adding activities
C) Non-Value-Adding / Wasteful activities
D) Administrative clutter and red tape

What are Business-Non-Value-Adding activities defined as?
A) Administrative tasks required by law, compliance, or reporting that do not directly change the citizen's service experience
B) Pure bureaucratic inefficiencies and unnecessary handoffs
C) Actions that directly create worth for service recipients
D) Illegal shortcuts used to bypass regulatory compliance

What characterizes Non-Value-Adding / Wasteful activities?
A) Pure bureaucratic inefficiencies, unnecessary approvals, and excessive handoffs that add cost and delay without benefiting anyone
B) Statutory auditing and mandatory regulatory filings
C) Direct service transformations requested by citizens
D) High-speed digital processing workflows

What does AS-IS vs. TO-BE evaluation involve in process analysis?
A) Critically reviewing existing workflows (AS-IS) and mapping out streamlined operational models (TO-BE)
B) Comparing employee salaries against private sector compensation
C) Auditing office furniture layouts and computer hardware
D) Reviewing historical political manifestos from past decades

What skill is required to simplify bureaucratic workflows?
A) Proposing and implementing simplified procedures that strip away red tape and reduce service delivery timeframes
B) Multiplying the number of supervisory sign-off layers
C) Hiding processing time statistics from executive management
D) Forcing citizens to submit physical paper files multiple times

How should institutional materials, time, and human capital be managed under resource optimization?
A) With maximum efficiency, ensuring optimal economic and developmental returns
B) With complete disregard for budgetary constraints
C) By distributing resources equally regardless of departmental impact
D) By hoarding supplies within isolated departmental silos

Why must public services be designed from the standpoint of citizen satisfaction?
A) To ensure administrative outputs genuinely meet public needs and standards of excellence
B) To satisfy internal managerial quotas without regard for quality
C) To increase the volume of paper forms archived annually
D) To justify higher taxation rates on citizens

What is the primary effect of value-adding work on administrative red tape?
A) Eliminating unnecessary administrative red tape and delays
B) Increasing the number of physical document verification stamps
C) Entrenching historical bureaucratic routines
D) Slowing down file processing to ensure absolute caution

How does value-adding work prevent misdirected efforts?
A) By aligning daily operational tasks with core national and institutional strategies
B) By allowing employees to choose tasks based on personal preference
C) By eliminating all strategic planning master documents
D) By centralizing all decision-making in a single desk

What do streamlined pathways achieve in public service delivery?
A) Elevating the speed, quality, and responsiveness of public administration
B) Increasing citizen waiting times and physical queues
C) Raising operational costs and administrative expenses
D) Creating artificial file bottlenecks across bureaus

What workplace mindset does embedding value-driven thinking cultivate?
A) Continuous learning, problem-solving, and Kaizen-based optimization
B) Rigid adherence to obsolete standard operating procedures
C) Complacent acceptance of administrative backlogs
D) Competitive turf warfare between directorates

What is the impact of value-adding work on cycle times and operational costs?
A) Significant reduction in processing cycle times and operational costs
B) Dramatic increase in administrative expenses and processing delays
C) Zero impact on cycle times or taxpayer expenditures
D) Elimination of all administrative budgets

What happens to organizational throughput when processes are streamlined?
A) Measurable increase in institutional throughput and productivity
B) Complete paralysis of daily operational workflows
C) Reduction in the volume of public service requests handled
D) Heavy reliance on corrective rework and error patching

How does high-quality, cost-effective service affect public trust?
A) Direct elevation of public satisfaction and trust in government administration
B) Deepening public suspicion and administrative alienation
C) Total erosion of state legitimacy and institutional credibility
D) Zero change in public perception of state efficiency

What behavioral indicator reflects a public servant executing value-adding work?
A) Routinely questioning inefficient routines and proposing practical workflow improvements
B) Blindly following obsolete laws without suggesting revisions
C) Guarding departmental files in closed, isolated silos
D) Complaining about resource constraints without taking initiative

How is task prioritization reflected in daily work organization?
A) Focusing energy on core value-generating activities rather than non-essential paper-pushing
B) Prioritizing minor administrative distractions over strategic goals
C) Delaying complex assignments until final statutory deadlines
D) Treating every incoming memo with identical urgency

What role do Kaizen initiatives play in value-adding work?
A) Actively participating in continuous improvement projects and problem-solving groups aimed at eliminating waste
B) Maintaining rigid adherence to historical administrative routines
C) Banning all incremental workflow enhancements
D) Replacing continuous learning with mandatory overtime

How do professionals demonstrate resourcefulness under operational constraints?
A) Delivering superior results within shorter timeframes and constrained budgets through ingenuity
B) Halting work entirely until additional budget funds are secured
C) Cutting service quality standards to match resource shortages
D) Passing difficult assignments to adjacent directorates

What does the operational value addition dimension focus on?
A) Direct service transformation: speeding up processing times, reducing error rates, and executing daily tasks cost-effectively
B) Leading high-level structural reforms and legislative revisions
C) Managing interpersonal conflict and emotional intelligence
D) Ensuring transparent, respectful citizen communication

What does strategic value addition center on?
A) Identifying obsolete laws, policies, and systemic bottlenecks through research and leading structural reforms
B) Signing routine daily transaction documents at service counters
C) Maintaining office attendance rosters and stationery inventories
D) Resolving individual citizen grievances at front desks

What does relational value addition highlight?
A) The creation of worth from the citizen's perspective, ensuring transparent, respectful, and economically justified service interactions
B) Internal financial auditing and budgetary reconciliations
C) Digital software programming and database maintenance
D) Cross-departmental turf wars over project ownership

What are common barriers to value creation in public sector environments?
A) Resistance to change, rigid adherence to outdated rules, fear of innovation, and lack of awareness regarding Kaizen/BPR
B) Excessive employee participation in continuous learning programs
C) Complete absence of legislative rules and compliance frameworks
D) Immediate adoption of private sector management structures

How do institutions mitigate barriers to value creation?
A) Fostering a continuous learning culture, providing platforms to propose revisions, recognizing workflow innovators, and conducting policy audits
B) Punishing employees who question historical standard operating procedures
C) Increasing the number of physical approval signatures required for files
D) Eliminating all performance appraisals and feedback loops

Why is questioning obsolete policies critical for value addition?
A) It prevents outdated rules from dragging down commercial and administrative velocity
B) It allows employees to break criminal laws at will
C) It replaces the need for legislative proclamations
D) It guarantees automatic salary promotions

What distinguishes strategic value addition from operational value addition?
A) Strategic value addition focuses on systemic reforms and obsolete laws, while operational value addition focuses on transaction speed and error reduction
B) Strategic value addition is illegal, while operational work is mandatory
C) Operational value addition is performed exclusively by senior executives
D) There is no structural difference between the two

How does value-adding work support national development goals?
A) By ensuring public expenditures yield high economic and societal returns, accelerating overall national progress
B) By increasing state debt through inefficient public spending
C) By centralizing all economic activity in government hands
D) By eliminating private sector commercial participation

What is the ultimate cultural outcome of embedding value-adding competencies across an agency?
A) Transforming public offices into responsive, high-performing service centers committed to continuous improvement
B) Creating rigid, unyielding bureaucracies that resist all modernization
C) Entrenching chronic procrastination and administrative backlogs
D) Reducing overall institutional throughput and productivity

What does "carrying out responsibility" represent as a foundational civil service competency?
A) The bedrock of professional discipline and state execution
B) A casual preference for completing tasks when convenient
C) An optional guideline for senior administrative executives
D) A temporary emergency response protocol

How is carrying out responsibility officially defined in the text?
A) Diligently performing assigned tasks with quality, according to plans/targets, on time, and taking full accountability for successes and failures
B) Doing the bare minimum required while waiting for managerial supervision
C) Passing difficult administrative files to adjacent directorates
D) Memorizing institutional rulebooks verbatim without execution

What distinguishes passive task execution from accountable, conscientious ownership?
A) Passive execution does the bare minimum when watched, while conscientious ownership embraces assignments with personal pride and independent follow-through
B) Passive execution is superior for complex multi-year projects
C) Conscientious ownership means ignoring all supervisory instructions
D) There is no functional difference between the two

What is individual responsibility directly linked to in public administration?
A) The broader social contract, state credibility, and citizen welfare
B) Personal financial compensation and salary bonuses
C) Political party affiliation and election cycles
D) Private corporate profit margins

What does reliable autonomous execution involve?
A) Taking complete charge of an assigned project and delivering high-quality results without micro-management
B) Waiting for constant supervisory reminders before starting work
C) Abandoning tasks midway through execution
D) Deflecting accountability when targets are missed

Why is meeting deadlines consistently emphasized under responsibility?
A) To respect institutional timeframes, organize personal work schedules, and ensure timely output submission
B) To fill office attendance sheets on time
C) To eliminate the need for project planning master documents
D) To satisfy arbitrary calendar requirements with zero regard for quality

What does true responsibility require regarding project outcomes?
A) Absolute courage in owning both positive and negative consequences of decisions
B) Blaming external circumstances or colleagues when targets are missed
C) Claiming credit only for successes while hiding failures
D) Deflecting supervisory evaluations through administrative excuses

How should performance reviews, audits, and supervisory feedback be treated by responsible professionals?
A) As constructive tools for professional growth and continuous improvement
B) As personal attacks that must be contested aggressively
C) As irrelevant paperwork that should be ignored
D) As confidential documents hidden from public review

What does diligent quality control involve in task execution?
A) Double-checking work outputs against set plans, target metrics, and institutional standards to avoid careless errors
B) Submitting completed assignments past statutory deadlines
C) Relying on heavy rework from adjacent colleagues
D) Ignoring institutional specifications to speed up task delivery

What does procedural integrity require while carrying out assignments?
A) Following established laws, ethical guidelines, and institutional rules meticulously
B) Bending compliance rules whenever processing speeds are slow
C) Replacing formal regulations with personal discretion
D) Granting exemptions to personal acquaintances

How do responsible professionals handle unforeseen operational roadblocks?
A) Anticipating hurdles early and finding practical, lawful solutions on the fly rather than halting work
B) Stopping work entirely and waiting for someone else to fix the issue
C) Blaming adjacent departments for resource shortages
D) Abandoning the project and deleting all documentation

Why is disciplined task execution vital across interconnected government operations?
A) Because every individual's output serves as an input for the next administrative step in the chain
B) Because it increases the total number of paper files stored in archives
C) Because it eliminates the requirement for cross-functional teamwork
D) Because government agencies operate in absolute isolation

What is the impact of disciplined task execution on administrative backlogs?
A) Curbing backlogs and ensuring a smooth, dependable flow of casework from intake to resolution
B) Creating massive document piles that stall public service counters
C) Slowing down file processing to ensure absolute caution
D) Zero impact on administrative processing volumes

How does responsible stewardship affect public resources?
A) Preventing resource waste, costly errors, and inefficiency, maximizing the value of every state asset
B) Consuming maximum budgetary funds before fiscal year deadlines
C) Hoarding working hours and materials in private offices
D) Eliminating the need for financial auditing and reporting

What is the effect of responsibility on peer and supervisory trust?
A) Deepening team collaboration and giving managers confidence to delegate critical tasks
B) Increasing inter-office friction and mutual suspicion
C) Forcing managers to micromanage every minute action
D) Zero impact on professional relationships

How does individual responsibility impact institutional goal attainment?
A) Driving the achievement of strategic plans, ensuring annual institutional goals are met or exceeded
B) Causing widespread project failures and statutory defaults
C) Slowing down institutional throughput and productivity
D) Replacing strategic plans with arbitrary administrative tasks

What observable behavior reflects high responsibility?
A) Delivering required work outputs on or ahead of schedule and reviewing work against target metrics
B) Habitually delaying tasks until the final hours before statutory deadlines
C) Blaming colleagues or inter-departmental delays for personal performance failures
D) Leaving assignments half-finished and requiring constant reminders

How do responsible professionals handle potential workflow bottlenecks?
A) Keeping management informed of project progress and flagging potential bottlenecks before escalation
B) Hiding workflow statuses from supervisors until projects collapse
C) Ignoring operational hurdles and hoping they resolve themselves
D) Blaming citizens for submitting incomplete paperwork

What behavioral indicator reflects low responsibility?
A) Procrastinating, missing deadlines, blaming others, and leaving tasks half-finished
B) Consistent autonomous execution and diligent quality control
C) Proactively anticipating hurdles and updating supervisors transparently
D) Welcoming audit feedback as a tool for professional growth

How do responsible professionals manage heavy workloads under intense pressure?
A) Prioritizing competing assignments methodically, maintaining composure, and ensuring quality does not drop
B) Panicking and abandoning statutory responsibilities
C) Demanding that all deadlines be cancelled immediately
D) Passing all complex tasks to junior staff members

What action should be taken when institutional directives or task instructions are ambiguous?
A) Taking the initiative to seek immediate clarification rather than using ambiguity as an excuse for inaction
B) Using ambiguity as a justification for abandoning the task entirely
C) Inventing new rules and bypassing legal compliance frameworks
D) Waiting indefinitely for top-down supervisory compulsion

What are Individual Performance Plans (IPPs) used for in responsibility?
A) Breaking down annual institutional targets into quarterly, monthly, and weekly personal milestones
B) Hiding organizational objectives from frontline staff members
C) Setting impossible quotas designed to cause administrative failure
D) Replacing institutional strategic master plans

What purpose do task tracking logs and work calendars serve?
A) Monitoring project statuses, tracking pending deliverables, and scheduling time blocks for high-priority responsibilities
B) Counting physical office attendance hours and coffee breaks
C) Hiding delayed files from internal auditors
D) Replacing formal performance appraisals entirely

How do time-management tools like the Eisenhower Matrix support responsibility?
A) Categorizing daily tasks by urgency and importance to prevent minor distractions from crowding out core duties
B) Encouraging chronic procrastination and last-minute panic rushes
C) Eliminating the need for scheduling or priority setting
D) Forcing employees to work 24 hours a day without rest

What is the benefit of peer-accountability check-ins?
A) Reviewing weekly progress, sharing workload tips, and keeping each other accountable for upcoming project deadlines
B) Enforcing strict authoritarian command and control across teams
C) Replacing formal supervisory evaluations with informal office gossip
D) Increasing interpersonal friction and departmental turf wars

Why is carrying out responsibility assigned a heavy percentage weight in civil service examinations?
A) Because it serves as the foundational backbone of public sector productivity and state execution
B) Because technical proficiency and emotional intelligence are completely irrelevant
C) Because responsibility is the easiest competency to memorize verbatim
D) Because it replaces all legal proclamations and anti-corruption laws

What defines Level 1 (Below Expectations) on the responsibility behavioral anchor scale?
A) Frequently misses deadlines, produces substandard work requiring heavy rework, and blames others for failures
B) Diligently performs assigned tasks on time and accepts accountability for normal outcomes
C) Surpasses target metrics, takes total ownership of complex projects, and anticipates hurdles proactively
D) Models exemplary professional diligence and mentors junior staff

What defines Level 2 (Meets Expectations) on the responsibility behavioral anchor scale?
A) Diligently performs assigned tasks on time, follows institutional plans dependably, and accepts normal accountability
B) Requires micro-management to complete basic administrative duties
C) Consistently surpasses institutional targets and innovates new operational frameworks
D) Habitually delays work and blames external circumstances for errors

What defines Level 3 (Exceeds Expectations) on the responsibility behavioral anchor scale?
A) Consistently surpasses target metrics, takes total ownership of complex projects, and anticipates hurdles proactively
B) Delivers standard work outputs only when supervised constantly
C) Avoids difficult assignments and shifts blame downward
D) Follows routine instructions with standard error rates

What is the objective of task-prioritization simulations in responsibility assessments?
A) Evaluating how candidates organize, prioritize, and timeline an overloaded schedule under time pressure
B) Testing candidates' ability to memorize legal proclamations verbatim
C) Measuring physical typing speed and computer hardware literacy
D) Assessing public speaking and political lobbying skills

What do accountability-focused case studies analyze?
A) Failed public projects or delayed workflows to identify breakdown points, assign accountability, and design corrective strategies
B) Successful private corporate mergers and stock market fluctuations
C) Personal biographical backgrounds of executive candidates
D) Historical architectural designs of government office buildings

How do structured behavioral interviews assess responsibility?
A) Prompting candidates to describe past high-stakes tasks where roadblocks were overcome and full accountability was taken
B) Asking candidates to recite theoretical definitions from rulebooks
C) Testing candidates' emotional reactivity through provocative insults
D) Evaluating candidates' political party loyalty and connections

What is the cumulative macro-level impact of individual civil servants carrying out their responsibilities?
A) Defining how citizens perceive the entire state apparatus, restoring competence, and deepening public accountability
B) Increasing administrative red tape and slowing down national development
C) Creating widespread public mistrust in government administrative capacity
D) Eliminating the need for transparent governance frameworks

How does leadership as a behavioral competency extend beyond hierarchical rank?
A) It is an action-oriented mindset defined by personal accountability, initiative, and lifting team capability regardless of formal title
B) It requires holding an official executive office or supervisory rank to function
C) It applies exclusively to retired civil servants and external consultants
D) It means refusing all commands issued by senior government authorities

What does leadership involve regarding future conditions and task execution?
A) Anticipating, analyzing, and forecasting future conditions to establish options, executing tasks sequentially, and managing change
B) Reacting exclusively to immediate daily crises without planning ahead
C) Maintaining rigid adherence to historical routines without adaptation
D) Halting all operations until absolute future certainty is achieved

What distinguishes authoritarian command-and-control from visionary, empowering leadership?
A) Command-and-control relies on hierarchy, fear, and rigid oversight, while visionary leadership relies on shared purpose, trust, and autonomy
B) Command-and-control fosters extreme workplace creativity and innovation
C) Visionary leadership punishes all mistakes severely through public reprimand
D) There is no structural difference between the two leadership styles

How is leadership contextualized within public service administration?
A) As an act of public stewardship managing state resources, public trust, and policy implementation on behalf of citizens
B) As a mechanism for personal financial enrichment and status
C) As a political tool for winning electoral campaigns
D) As an administrative chore focused solely on paper-pushing

What is the role of visionary direction and strategic alignment in leadership?
A) Providing absolute clarity of purpose by breaking government proclamations into actionable departmental milestones
B) Keeping operational units moving in random, uncoordinated directions
C) Eliminating institutional strategic master plans entirely
D) Replacing national development goals with personal preferences

How is true leadership measured regarding team development?
A) Not by how much control a manager retains, but by how many leaders they successfully develop
B) By how many employees are micmanaged on a daily basis
C) By how many bureaucratic approval layers are added to workflows
D) By the volume of paper files archived under the manager's name

What challenge do public administrators frequently face regarding decision-making?
A) Operating under conditions of ambiguity, resource constraints, and high public scrutiny
B) Operating with perfect data, unlimited budgets, and zero public oversight
C) Operating in absolute isolation from legal compliance frameworks
D) Operating without any strategic targets or performance metrics

What does navigating ambiguity involve for leaders?
A) Making timely, well-reasoned choices when complete data or perfect conditions are absent, balancing compliance and pragmatism
B) Halting all institutional operations until absolute certainty is secured
C) Ignoring legal compliance frameworks to speed up administrative approvals
D) Guessing randomly and blaming subordinates for negative outcomes

How does leadership handle institutional reforms and technological transitions?
A) Guiding staff through workflow re-engineering and new tools by reducing resistance, addressing anxiety, and championing change
B) Forcing staff to adopt new software overnight without instructions or support
C) Prohibiting all technological upgrades to preserve historical routines
D) Punishing employees who express anxiety about organizational change

What is the role of leadership in coordinating strategy and execution?
A) Acting as the central anchor linking broad government policies down to daily frontline administrative actions
B) Creating departmental silos that isolate operational data
C) Eliminating frontline administrative execution entirely
D) Separating high-level policy design from ground-level service delivery

How does strong leadership impact employee retention?
A) Creating an environment of growth and psychological safety that keeps high-performing professionals engaged
B) Forcing talented civil servants to resign due to toxic command-and-control
C) Offering secret financial bribes to prevent staff departures
D) Zero impact on employee turnover rates

What critical intersection does leadership navigate regarding state priorities?
A) The interface where political governance meets technical execution
B) The boundary between private corporate profit and public taxation
C) The division between regional bureaus and international embassies
D) The separation between paper files and digital databases

What is the effect of leadership on subordinate morale and psychological safety?
A) Leaders who listen, validate effort, and champion teams foster deep purpose and safe environments to report errors
B) Leaders who use authoritarian command destroy morale and force staff to hide errors
C) Morale is determined solely by salary scales, not leadership style
D) Psychological safety has no connection to leadership behavior

How do leaders break down organizational silos?
A) By actively modeling cross-functional collaboration and encouraging directorates to share data and coordinate joint initiatives
B) By building physical walls between departmental offices
C) By punishing units that communicate with adjacent bureaus
D) Silos can never be broken down by institutional leaders

What observable behavior reflects strong leadership?
A) Leading by example ("walking the talk"), providing constructive feedback, and protecting team integrity
B) Micromanaging staff, shifting blame downward, and ignoring professional development
C) Hiding in a private office and issuing anonymous top-down decrees
D) Taking personal credit for collaborative team successes

What behavioral pattern defines weak leadership (Level 1: Below Expectations)?
A) Authoritarian command-and-control, micromanagement, blaming subordinates, and opaque decision-making
B) Visionary guidance, psychological safety, strategic delegation, and transformational coaching
C) Dependable operational management, fair task distribution, and constructive feedback
D) Exceptional crisis management and cross-functional synergy

What defines a competent supervisor (Level 2: Meets Expectations) in leadership?
A) Manages operations dependably, delegates tasks fairly, provides basic guidance, and maintains ethical compliance
B) Relies on authoritarian command and micromanages every minute action
C) Inspires exceptional team engagement and champions institutional innovation
D) Frequently misses deadlines and shifts blame downward

What defines a visionary leader (Level 3: Exceeds Expectations) in leadership?
A) Inspires psychological safety, mentors future leaders, navigates ambiguity with composure, and champions innovation
B) Manages routine operations with standard oversight and basic guidance
C) Relies on fear of reprisal to force compliance from subordinates
D) Ignores staff development and focuses solely on personal career advancement

What is the purpose of in-basket exercises in leadership assessments?
A) Evaluating how a candidate prioritizes, delegates, makes high-stakes decisions, and communicates under time constraints
B) Testing candidates' ability to memorize historical civil service proclamations verbatim
C) Measuring physical typing speed and computer hardware assembly skills
D) Assessing candidates' political party loyalty and campaign fundraising ability

What do leadership simulation scenarios test?
A) Strategic thinking, emotional composure, and influence tactics during simulated crises, change management, or conflicts
B) Personal financial auditing and budgetary reconciliation skills
C) Manual paper-filing speed and archival organization
D) Foreign language fluency and international diplomacy

How do structured behavioral interviews assess leadership capability?
A) Prompting candidates to describe past executive experiences leading teams through structural reforms or resource shortages
B) Asking candidates to recite theoretical definitions from competency textbooks
C) Testing candidates' physical endurance and office attendance punctuality
D) Evaluating candidates' personal wealth and social connections

What is the core purpose of situational leadership frameworks?
A) Tailoring management styles to the specific readiness, maturity, and developmental needs of staff
B) Enforcing a rigid, unyielding command-and-control rule across all institutional tiers
C) Eliminating the need for supervisory feedback or coaching support
D) Automating executive decision-making through digital software

What is the function of executive mentorship programs?
A) Pairing high-potential mid-level professionals with senior executive mentors to transfer strategic knowledge and wisdom
B) Forcing junior staff to perform personal errands for senior executives
C) Replacing formal performance appraisals with informal office gossip
D) Eliminating the internal talent pipeline for administrative roles

What do 360-degree feedback loops ensure for leaders?
A) Self-awareness and continuous growth by receiving multi-directional evaluations from supervisors, peers, and direct reports
B) Absolute infallibility and immunity from performance reviews
C) Immediate termination of any peer who provides critical feedback
D) Zero accountability for team operational outcomes

How do transparent communication channels impact an agency?
A) Ensuring strategic goals, policy changes, and institutional challenges are understood across all administrative tiers
B) Creating hidden administrative hurdles and propagating rumors
C) Slowing down public service delivery through excessive town halls
D) Eliminating the need for written operational policies

What is the role of strategic delegation matrices (such as RACI charts)?
A) Empowering lower management tiers, freeing executive bandwidth, and accelerating day-to-day approvals
B) Confusing employees regarding their reporting hierarchy and responsibilities
C) Restricting all decision-making authority exclusively to top executives
D) Tracking employee attendance hours and lunch breaks

Why is leadership assigned a significant percentage weight in promotional appraisals?
A) To ensure individuals stepping into supervisory or executive roles possess the necessary behavioral capabilities to steer public agencies
B) Because technical expertise and ethical compliance are completely irrelevant for leaders
C) Because leadership is the easiest competency to evaluate through written tests
D) Because it replaces all legal proclamations governing civil service operations

How does leadership uphold ethical governance and public trust?
A) By strictly adhering to anti-corruption policies, transparency norms, and setting an uncompromised ethical benchmark
B) By granting secret exemptions to personal acquaintances and political allies
C) By hiding administrative misconduct from oversight bodies and the public
D) Ethical governance is managed entirely by auditors, not leaders

What is the effect of micromanagement on team innovation and initiative?
A) Stifling initiative, destroying creativity, and stripping professionals of autonomy
B) Fostering extreme workplace innovation and autonomous problem-solving
C) Accelerating public service delivery and reducing processing cycle times
D) Zero impact on employee creativity or autonomy

How does visionary leadership handle resource constraints?
A) Finding creative, cost-effective solutions when budgets and equipment are scarce, ensuring service continuity
B) Halting all public service operations until additional budget funds are secured
C) Slashing service quality standards to match budget shortages
D) Blaming external economic factors for operational failures

What is the ultimate impact of high leadership competency on public sector institutions?
A) Clear institutional direction, organizational sustainability, enhanced agility, and deep public trust in state legitimacy
B) Widespread administrative backlogs, bureaucratic stagnation, and loss of public confidence
C) Complete elimination of legal oversight and regulatory compliance frameworks
D) Centralization of all state power in a single unyielding bureau

How do Chapter 13, 14, and 15 collectively support the Result pillar of the competency framework?
A) By centering on taxpayer value (Ch. 13), execution responsibility (Ch. 14), and leadership artistry (Ch. 15) to achieve sustainable institutional success
B) By focusing exclusively on theoretical policy design without practical execution
C) By replacing all work and human behavioral competencies with administrative red tape
D) By eliminating accountability and performance metrics across government bureaus`;

// Let's parse all questions
function parseQuestions(text) {
  const blocks = text.trim().split(/\n\s*\n/);
  const questions = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 5) continue;

    const qText = lines[0];
    const optA = lines.find(l => /^A\)/.test(l))?.replace(/^A\)\s*/, '') || '';
    const optB = lines.find(l => /^B\)/.test(l))?.replace(/^B\)\s*/, '') || '';
    const optC = lines.find(l => /^C\)/.test(l))?.replace(/^C\)\s*/, '') || '';
    const optD = lines.find(l => /^D\)/.test(l))?.replace(/^D\)\s*/, '') || '';

    if (qText && optA && optB && optC && optD) {
      // In the answer key provided, 2 is B (index 1), all others are A (index 0)
      let correctIndex = 0;
      if (questions.length + 1 === 2) {
        correctIndex = 1;
      }
      questions.push({
        text: qText,
        options: [optA, optB, optC, optD],
        correctOptionIndices: [correctIndex]
      });
    }
  }
  return questions;
}

const parsed = parseQuestions(rawQuestions);
console.log(`Parsed ${parsed.length} questions.`);

if (parsed.length !== 100) {
  console.error(`Expected 100 questions, got ${parsed.length}`);
  process.exit(1);
}

async function insertIntoDbs() {
  const now = new Date().toISOString();
  const categoryId = 'ad842eb6-4202-4a57-ae73-007ede7ea79f';
  const authorId = 'e6a0cc7f-1d9c-45ed-8139-457031b71f3c'; // admin

  const subjectId = crypto.randomUUID();
  const subjectSlug = 'management-exam-1';
  const subjectName = 'Management Exam 1 - Result Pillar & Leadership';

  const examTemplateId = crypto.randomUUID();
  const examSlug = 'management-exam-1';
  const examName = 'Management Exam 1 - Result Pillar & Leadership';
  const examDesc = '100-question exam covering the Result Pillar: Value-Adding Work (Ch. 13), Carrying Out Responsibility (Ch. 14), and Leadership (Ch. 15).';

  // 1. Insert into SQLite
  const sqliteDb = new DatabaseSync(path.resolve(__dirname, '../prisma/exam.db'));
  
  // Insert Subject
  const insertSubStmt = sqliteDb.prepare(`
    INSERT INTO Subject (id, slug, name, categoryId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertSubStmt.run(subjectId, subjectSlug, subjectName, categoryId, now, now);

  // Insert ExamTemplate
  const insertExamStmt = sqliteDb.prepare(`
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
  `);
  insertExamStmt.run(examTemplateId, examSlug, examName, categoryId, subjectId, examDesc, now, now, now);

  // Insert Questions
  const insertQStmt = sqliteDb.prepare(`
    INSERT INTO Question (
      id, questionId, questionText, categoryId, subjectId, topicId, difficulty, questionType,
      options, correctOptionIndices, explanation, marks, negativeMarks, tags,
      learningObjectives, source, authorId, status, publishedAt, archivedAt,
      importId, canonicalIndices, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, NULL, 'INTERMEDIATE', 'SINGLE_CHOICE',
      ?, ?, NULL, 1, NULL, '[]',
      NULL, 'Management Exam 1', ?, 'PUBLISHED', ?, NULL,
      NULL, '[0,1,2,3]', ?, ?
    )
  `);

  const questionsToInsert = [];
  for (let i = 0; i < parsed.length; i++) {
    const q = parsed[i];
    const qId = crypto.randomUUID();
    const optJson = JSON.stringify(q.options);
    const ansJson = JSON.stringify(q.correctOptionIndices);
    insertQStmt.run(qId, qId, q.text, categoryId, subjectId, optJson, ansJson, authorId, now, now, now);
    questionsToInsert.push({
      id: qId,
      questionId: qId,
      text: q.text,
      options: optJson,
      correct: ansJson
    });
  }
  console.log('Inserted into SQLite successfully.');

  // 2. Insert into PostgreSQL (Supabase)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query(`
      INSERT INTO "Subject" (id, slug, name, "categoryId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [subjectId, subjectSlug, subjectName, categoryId, now, now]);

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
    `, [examTemplateId, examSlug, examName, categoryId, subjectId, examDesc, now, now, now]);

    for (const q of questionsToInsert) {
      await pool.query(`
        INSERT INTO "Question" (
          id, "questionId", "questionText", "categoryId", "subjectId", "topicId", difficulty, "questionType",
          options, "correctOptionIndices", explanation, marks, "negativeMarks", tags,
          "learningObjectives", source, "authorId", status, "publishedAt", "archivedAt",
          "importId", "canonicalIndices", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, NULL, 'INTERMEDIATE', 'SINGLE_CHOICE',
          $6, $7, NULL, 1, NULL, '[]',
          NULL, 'Management Exam 1', $8, 'PUBLISHED', $9, NULL,
          NULL, '[0,1,2,3]', $10, $11
        )
      `, [q.id, q.questionId, q.text, categoryId, subjectId, q.options, q.correct, authorId, now, now, now]);
    }
    console.log('Inserted into Supabase PostgreSQL successfully.');
  } finally {
    await pool.end();
  }
}

insertIntoDbs().catch(console.error);
