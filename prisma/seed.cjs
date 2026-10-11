/**
 * `npm run db:seed` (add --force to wipe and re-seed)
 *
 * Populates demo users, a category/subject/topic taxonomy, a question bank,
 * and exam templates. Refuses to run against a non-empty question bank unless
 * --force is passed, so it cannot silently duplicate content.
 */
"use strict";

const bcrypt = require("bcryptjs");
const { openDatabase, newId, now } = require("./_shared.cjs");

const force = process.argv.includes("--force");

// -------------------------------------------------------------- content ----

const USERS = [
  { email: "admin@exam.local", password: "Admin#12345", name: "Ava Administrator", role: "ADMINISTRATOR" },
  { email: "instructor@exam.local", password: "Instructor#123", name: "Ivan Instructor", role: "INSTRUCTOR" },
  { email: "student@exam.local", password: "Student#12345", name: "Sam Student", role: "STUDENT" },
];

const TAXONOMY = [
  {
    slug: "cloud-certification",
    name: "Cloud Certification",
    code: "CLD",
    description: "Vendor cloud certification preparation.",
    subjects: [
      {
        slug: "aws-fundamentals",
        name: "AWS Fundamentals",
        topics: [
          { slug: "iam", name: "Identity and Access Management" },
          { slug: "s3", name: "Object Storage" },
          { slug: "ec2", name: "Compute" },
        ],
      },
      {
        slug: "azure-fundamentals",
        name: "Azure Fundamentals",
        topics: [
          { slug: "azure-ad", name: "Identity and Governance" },
          { slug: "networking", name: "Network Connectivity" },
        ],
      },
    ],
  },
  {
    slug: "data-science",
    name: "Data Science",
    code: "DSC",
    description: "Statistics and applied machine learning.",
    subjects: [
      {
        slug: "statistics",
        name: "Applied Statistics",
        topics: [
          { slug: "descriptive-stats", name: "Descriptive Statistics" },
          { slug: "probability", name: "Probability" },
        ],
      },
      {
        slug: "machine-learning",
        name: "Machine Learning",
        topics: [
          { slug: "supervised-learning", name: "Supervised Learning" },
          { slug: "model-evaluation", name: "Model Evaluation" },
        ],
      },
    ],
  },
];

// marks are derived from difficulty; negativeMarks is the deduction applied
// when a template has negativeMarking enabled.
const MARKS = { EASY: 1, INTERMEDIATE: 1.5, HARD: 2, EXPERT: 3 };

const QUESTIONS = [
  // ---------------------------------------------------- AWS Fundamentals --
  {
    subject: "aws-fundamentals", topic: "iam", difficulty: "EASY", type: "SINGLE_CHOICE",
    text: "Which AWS identity type is best suited for a workload on an EC2 instance that must call S3, without storing long-lived access keys?",
    options: [
      "An IAM role attached to the instance profile",
      "The root account access key stored on disk",
      "An IAM user access key written into the application config",
      "The AWS account alias",
    ],
    correct: [0],
    explanation: "IAM roles supply temporary credentials through the instance metadata service, so no long-lived key exists on the instance.",
    tags: ["iam", "security"],
  },
  {
    subject: "aws-fundamentals", topic: "iam", difficulty: "HARD", type: "SINGLE_CHOICE",
    text: "An IAM policy grants s3:GetObject on arn:aws:s3:::reports/*. The user still cannot read objects, and the bucket policy contains an explicit Deny for that user. Why?",
    options: [
      "An explicit deny always overrides any allow",
      "Allows are evaluated before denies",
      "Bucket policies do not apply to IAM users",
      "The wildcard does not match object keys",
    ],
    correct: [0],
    explanation: "IAM evaluates explicit deny first: a single explicit deny in any applicable policy wins over every allow.",
    tags: ["iam", "security"],
  },
  {
    subject: "aws-fundamentals", topic: "iam", difficulty: "INTERMEDIATE", type: "MULTIPLE_CHOICE",
    text: "Which of the following are valid IAM policy evaluation outcomes? (Select all that apply)",
    options: ["Explicit allow", "Explicit deny", "Implicit deny by default", "Automatic retry"],
    correct: [0, 1, 2],
    explanation: "Requests end as allowed or denied explicitly, or denied implicitly because no statement matched. There is no retry outcome.",
    tags: ["iam"],
  },
  {
    subject: "aws-fundamentals", topic: "s3", difficulty: "EASY", type: "SINGLE_CHOICE",
    text: "Which S3 storage class redundantly stores data across at least three Availability Zones and is designed for frequently accessed data?",
    options: ["S3 Standard", "S3 One Zone-IA", "S3 Glacier Deep Archive", "S3 Outposts"],
    correct: [0],
    explanation: "S3 Standard replicates across three or more AZs. One Zone-IA uses a single AZ, and Glacier classes are archival or single-AZ.",
    tags: ["s3", "storage"],
  },
  {
    subject: "aws-fundamentals", topic: "s3", difficulty: "INTERMEDIATE", type: "SINGLE_CHOICE",
    text: "Which S3 feature prevents an object version from being deleted, even by the account root user, for a defined retention period?",
    options: [
      "Object Lock in compliance mode",
      "Bucket ACLs",
      "Server-side encryption with SSE-S3",
      "Lifecycle transition rules",
    ],
    correct: [0],
    explanation: "Object Lock compliance mode cannot be bypassed or shortened by any user, including the root user, until the retention period ends.",
    tags: ["s3", "retention"],
  },
  {
    subject: "aws-fundamentals", topic: "s3", difficulty: "EASY", type: "TRUE_FALSE",
    text: "S3 provides strong read-after-write consistency for PUT operations that create a new object.",
    options: ["True", "False"],
    correct: [0],
    explanation: "Since December 2020 S3 gives strong read-after-write consistency for new object PUTs, overwrites, and deletes.",
    tags: ["s3"],
  },
  {
    subject: "aws-fundamentals", topic: "ec2", difficulty: "INTERMEDIATE", type: "SINGLE_CHOICE",
    text: "A workload will run for three years with steady usage, and you want to change instance family at least once during the term. Which pricing model fits best?",
    options: ["Compute Savings Plan", "On-Demand", "Spot Instances", "Dedicated Hosts"],
    correct: [0],
    explanation: "Compute Savings Plans apply across instance families, sizes, and Regions, unlike EC2 Instance Savings Plans.",
    tags: ["ec2", "cost"],
  },
  {
    subject: "aws-fundamentals", topic: "ec2", difficulty: "EASY", type: "SINGLE_CHOICE",
    text: "Spot Instances can be reclaimed with a two-minute interruption notice. Which workload is most appropriate?",
    options: [
      "Fault-tolerant batch processing that checkpoints progress",
      "A single-instance production database",
      "A latency-critical synchronous API tier",
      "A domain controller that must always be online",
    ],
    correct: [0],
    explanation: "Spot works for stateless or checkpointed work that tolerates interruption, not for single-instance stateful services.",
    tags: ["ec2", "cost"],
  },
  {
    subject: "aws-fundamentals", topic: "ec2", difficulty: "HARD", type: "MULTIPLE_CHOICE",
    text: "Which statements about EC2 placement groups are correct? (Select all that apply)",
    options: [
      "Cluster placement groups pack instances close together for low latency",
      "Spread placement groups place instances on distinct hardware to reduce correlated failure",
      "Partition placement groups isolate groups of instances across distinct racks",
      "Placement groups change an instance's public IP address",
    ],
    correct: [0, 1, 2],
    explanation: "Placement groups control physical placement only; they do not affect public IP addressing.",
    tags: ["ec2"],
  },

  // ------------------------------------------------ Azure Fundamentals ----
  {
    subject: "azure-fundamentals", topic: "azure-ad", difficulty: "EASY", type: "SINGLE_CHOICE",
    text: "Which Microsoft Entra ID object lets an application access Azure resources without storing a client secret?",
    options: ["A managed identity", "A guest user account", "A service account password", "A shared access signature"],
    correct: [0],
    explanation: "Managed identities remove credentials from the application entirely by using the platform's own token endpoint.",
    tags: ["identity", "security"],
  },
  {
    subject: "azure-fundamentals", topic: "azure-ad", difficulty: "INTERMEDIATE", type: "SINGLE_CHOICE",
    text: "When several Conditional Access policies apply to one sign-in, how are they evaluated?",
    options: [
      "All applicable policies are evaluated and the strictest controls apply",
      "Only the first policy in the list is evaluated",
      "Only the policy with the lowest priority number is evaluated",
      "Policies are evaluated alphabetically by name",
    ],
    correct: [0],
    explanation: "Conditional Access is cumulative: every matching policy is enforced, so the most restrictive requirement wins.",
    tags: ["identity"],
  },
  {
    subject: "azure-fundamentals", topic: "azure-ad", difficulty: "EASY", type: "TRUE_FALSE",
    text: "Microsoft Entra ID supports SAML 2.0 for federating enterprise applications.",
    options: ["True", "False"],
    correct: [0],
    explanation: "Entra ID supports SAML 2.0 as well as OpenID Connect and WS-Federation for enterprise application SSO.",
    tags: ["identity", "sso"],
  },
  {
    subject: "azure-fundamentals", topic: "networking", difficulty: "EASY", type: "SINGLE_CHOICE",
    text: "Which Azure service provides a dedicated private connection from on-premises to Azure that does not traverse the public internet?",
    options: ["Azure ExpressRoute", "Site-to-site VPN over IPsec", "Azure Front Door", "Azure DNS"],
    correct: [0],
    explanation: "ExpressRoute uses private peering through a connectivity provider. VPN gateways encrypt traffic but still cross the internet.",
    tags: ["network"],
  },
  {
    subject: "azure-fundamentals", topic: "networking", difficulty: "HARD", type: "SINGLE_CHOICE",
    text: "A subnet has an NSG, and its route table has a user-defined route for 0.0.0.0/0 pointing at a firewall appliance. Traffic still leaves directly to the internet. What is the most likely cause?",
    options: [
      "Route propagation is enabled, so a more specific system route still matches the destination",
      "NSGs reject all user-defined routes",
      "The firewall appliance has no public IP address",
      "Subnets cannot use user-defined routes",
    ],
    correct: [0],
    explanation: "Azure prefers the longest prefix match. A more specific system route for the destination wins over a 0.0.0.0/0 user route unless propagation is disabled.",
    tags: ["network", "routing"],
  },
  {
    subject: "azure-fundamentals", topic: "networking", difficulty: "INTERMEDIATE", type: "MULTIPLE_CHOICE",
    text: "Which capabilities does Azure Private Link provide? (Select all that apply)",
    options: [
      "Private access to Azure PaaS services over a private IP in your virtual network",
      "Traffic that stays on the Microsoft backbone network",
      "Automatic public DNS delegation to the zone apex",
      "Removal of the need for network security groups",
    ],
    correct: [0, 1],
    explanation: "Private Link gives a private endpoint and keeps traffic on the backbone. It does not manage public DNS zones or replace NSGs.",
    tags: ["network"],
  },

  // ---------------------------------------------------- Applied Statistics -
  {
    subject: "statistics", topic: "descriptive-stats", difficulty: "INTERMEDIATE", type: "SINGLE_CHOICE",
    text: "A dataset has a mean of 50 and a median of 80. What does this indicate?",
    options: [
      "A left-skewed distribution with low-value outliers",
      "A perfectly symmetric distribution",
      "A right-skewed distribution with high-value outliers",
      "A distribution with no outliers",
    ],
    correct: [0],
    explanation: "The mean sits below the median, so a tail of unusually low values is pulling it down: left skew.",
    tags: ["descriptive"],
  },
  {
    subject: "statistics", topic: "descriptive-stats", difficulty: "EASY", type: "SINGLE_CHOICE",
    text: "Which measure of spread is most resistant to extreme outliers?",
    options: ["Interquartile range", "Range", "Standard deviation", "Variance"],
    correct: [0],
    explanation: "The interquartile range uses the middle 50% of the data, so extreme values do not affect it.",
    tags: ["descriptive"],
  },
  {
    subject: "statistics", topic: "descriptive-stats", difficulty: "EASY", type: "SINGLE_CHOICE",
    text: "For a normal distribution, roughly what percentage of observations fall within one standard deviation of the mean?",
    options: ["68%", "50%", "95%", "99.7%"],
    correct: [0],
    explanation: "The empirical rule gives about 68% within one standard deviation, 95% within two, and 99.7% within three.",
    tags: ["descriptive", "normal"],
  },
  {
    subject: "statistics", topic: "descriptive-stats", difficulty: "HARD", type: "SINGLE_CHOICE",
    text: "Two datasets have identical means and identical standard deviations. Which statement is necessarily true?",
    options: [
      "They can still differ in shape, median, and range",
      "They must be identical datasets",
      "They must have the same median",
      "They must have the same range",
    ],
    correct: [0],
    explanation: "Mean and standard deviation describe center and spread only; the shape and other order statistics can differ freely.",
    tags: ["descriptive"],
  },
  {
    subject: "statistics", topic: "descriptive-stats", difficulty: "INTERMEDIATE", type: "MULTIPLE_CHOICE",
    text: "Which of these are measures of spread? (Select all that apply)",
    options: ["Variance", "Standard deviation", "Interquartile range", "Mode"],
    correct: [0, 1, 2],
    explanation: "The mode is a measure of central tendency, not spread.",
    tags: ["descriptive"],
  },
  {
    subject: "statistics", topic: "probability", difficulty: "EASY", type: "SINGLE_CHOICE",
    text: "Two fair six-sided dice are rolled. What is the probability that the sum is 7?",
    options: ["1/6", "1/12", "1/36", "7/36"],
    correct: [0],
    explanation: "Six of the thirty-six equally likely outcomes sum to 7, giving 6/36 = 1/6.",
    tags: ["probability"],
  },
  {
    subject: "statistics", topic: "probability", difficulty: "EASY", type: "SINGLE_CHOICE",
    text: "Events A and B are independent with P(A) = 0.4 and P(B) = 0.5. What is P(A and B)?",
    options: ["0.2", "0.9", "0.45", "0.1"],
    correct: [0],
    explanation: "For independent events, multiply: 0.4 x 0.5 = 0.2.",
    tags: ["probability"],
  },
  {
    subject: "statistics", topic: "probability", difficulty: "HARD", type: "SINGLE_CHOICE",
    text: "A test has 99% sensitivity and 99% specificity for a disease affecting 1 in 10,000 people. A patient tests positive. What is closest to the probability the patient actually has the disease?",
    options: ["About 1%", "About 99%", "About 50%", "About 10%"],
    correct: [0],
    explanation:
      "P(positive) = 0.99 x 0.0001 + 0.01 x 0.9999 = 0.010098. The positive predictive value is 0.000099 / 0.010098, about 1%. The low base rate dominates.",
    tags: ["probability", "bayes"],
  },
  {
    subject: "statistics", topic: "probability", difficulty: "INTERMEDIATE", type: "MULTIPLE_CHOICE",
    text: "Which statements about the central limit theorem are correct? (Select all that apply)",
    options: [
      "The sampling distribution of the mean approaches normality as sample size grows",
      "The approximation holds regardless of the population's shape once the sample size is large",
      "The standard error of the mean decreases as sample size increases",
      "It guarantees the sample mean equals the population mean",
    ],
    correct: [0, 1, 2],
    explanation: "The CLT says nothing about any single sample mean matching the population mean; it describes the sampling distribution.",
    tags: ["probability", "clt"],
  },

  // ----------------------------------------------------- Machine Learning --
  {
    subject: "machine-learning", topic: "supervised-learning", difficulty: "EASY", type: "SINGLE_CHOICE",
    text: "A model reaches 99% accuracy on training data and 62% on held-out data. What is the most likely problem?",
    options: ["Overfitting", "Underfitting", "Data leakage", "Perfect generalization"],
    correct: [0],
    explanation: "A large gap between training and held-out performance is the signature of overfitting.",
    tags: ["generalization"],
  },
  {
    subject: "machine-learning", topic: "supervised-learning", difficulty: "EASY", type: "SINGLE_CHOICE",
    text: "Which model is the most sensible starting point for an interpretable binary classification task on a small dataset?",
    options: [
      "Logistic regression",
      "A 50-layer deep neural network",
      "Gradient-boosted trees with 10,000 estimators",
      "k-means clustering",
    ],
    correct: [0],
    explanation: "Logistic regression is interpretable, stable on small data, and a strong baseline. k-means is also unsupervised.",
    tags: ["baseline"],
  },
  {
    subject: "machine-learning", topic: "supervised-learning", difficulty: "INTERMEDIATE", type: "MULTIPLE_CHOICE",
    text: "Which techniques help reduce overfitting? (Select all that apply)",
    options: [
      "L2 regularization",
      "Cross-validation for model selection",
      "Early stopping",
      "Adding more features without adding data",
    ],
    correct: [0, 1, 2],
    explanation: "Adding features without more data increases variance and typically worsens overfitting.",
    tags: ["regularization"],
  },
  {
    subject: "machine-learning", topic: "supervised-learning", difficulty: "HARD", type: "SINGLE_CHOICE",
    text: "A dataset is 95% negative and 5% positive. A model predicts 'negative' for every row. Which statement is correct?",
    options: [
      "Accuracy is 95% but recall for the positive class is 0",
      "Accuracy is 5% and recall is 0",
      "Precision for the positive class is 95%",
      "The model has a high AUC",
    ],
    correct: [0],
    explanation: "Predicting the majority class every time yields accuracy equal to the class prevalence, while recall for the positive class collapses to zero.",
    tags: ["imbalance", "metrics"],
  },
  {
    subject: "machine-learning", topic: "model-evaluation", difficulty: "INTERMEDIATE", type: "SINGLE_CHOICE",
    text: "Which metric summarizes ranking quality across all decision thresholds for a binary classifier?",
    options: ["Area under the ROC curve", "Accuracy", "Precision at one fixed threshold", "Mean squared error"],
    correct: [0],
    explanation: "AUC integrates true positive rate against false positive rate over every threshold.",
    tags: ["metrics"],
  },
  {
    subject: "machine-learning", topic: "model-evaluation", difficulty: "EASY", type: "SINGLE_CHOICE",
    text: "In 5-fold cross-validation, how is the model evaluated?",
    options: [
      "Train on four folds, evaluate on the held-out fold, and repeat so each fold is held out once",
      "Train on all five folds and report the training error",
      "Train five models and keep only the best one",
      "Split the data once into a train set and a test set",
    ],
    correct: [0],
    explanation: "Every observation serves in the validation set exactly once, and the reported score is the average across folds.",
    tags: ["validation"],
  },
  {
    subject: "machine-learning", topic: "model-evaluation", difficulty: "HARD", type: "SINGLE_CHOICE",
    text: "A training pipeline and a serving pipeline compute the same feature differently, so the model sees a different distribution at inference time. What is this called?",
    options: ["Training-serving skew", "Overfitting", "Concept drift", "Label noise"],
    correct: [0],
    explanation: "Training-serving skew is a mismatch between how features are produced for training and for inference. Concept drift is a change in the real world over time.",
    tags: ["production"],
  },
  {
    subject: "machine-learning", topic: "model-evaluation", difficulty: "INTERMEDIATE", type: "MULTIPLE_CHOICE",
    text: "Which statements about the F1 score are correct? (Select all that apply)",
    options: [
      "It is the harmonic mean of precision and recall",
      "It is low when either precision or recall is low",
      "It ignores true negatives",
      "It is the same as accuracy",
    ],
    correct: [0, 1, 2],
    explanation: "F1 balances precision and recall via the harmonic mean, and because it is built from precision and recall it never considers true negatives.",
    tags: ["metrics"],
  },
];

const TEMPLATES = [
  {
    slug: "aws-fundamentals-mock",
    name: "AWS Fundamentals Mock Exam",
    subject: "aws-fundamentals",
    description: "Six questions across IAM, S3, and EC2. Negative marking is enabled.",
    totalQuestions: 6,
    durationMinutes: 10,
    marksPerQuestion: 1,
    negativeMarking: true,
    passThresholdPercent: 60,
    difficultyDistribution: { EASY: 0.33, INTERMEDIATE: 0.5, HARD: 0.17 },
    randomizeQuestions: true,
    randomizeOptions: true,
  },
  {
    slug: "statistics-foundations",
    name: "Statistics Foundations",
    subject: "statistics",
    description: "Eight questions on descriptive statistics and probability. No negative marking.",
    totalQuestions: 8,
    durationMinutes: 20,
    marksPerQuestion: 1,
    negativeMarking: false,
    passThresholdPercent: 50,
    difficultyDistribution: { EASY: 0.5, INTERMEDIATE: 0.375, HARD: 0.125 },
    randomizeQuestions: true,
    randomizeOptions: true,
  },
  {
    slug: "cloud-certification-full",
    name: "Cloud Certification Full Mock",
    category: "cloud-certification",
    description: "Ten questions drawn from every cloud subject, with negative marking.",
    totalQuestions: 10,
    durationMinutes: 25,
    marksPerQuestion: 1,
    negativeMarking: true,
    passThresholdPercent: 65,
    difficultyDistribution: { EASY: 0.4, INTERMEDIATE: 0.4, HARD: 0.2 },
    randomizeQuestions: true,
    randomizeOptions: true,
  },
  {
    slug: "machine-learning-drill",
    name: "Machine Learning Evaluation Drill",
    subject: "machine-learning",
    description: "Short six-question drill focused on generalization and metrics.",
    totalQuestions: 6,
    durationMinutes: 12,
    marksPerQuestion: 1,
    negativeMarking: false,
    passThresholdPercent: 50,
    difficultyDistribution: { EASY: 0.5, INTERMEDIATE: 0.33, HARD: 0.17 },
    randomizeQuestions: true,
    randomizeOptions: true,
  },
];

// ------------------------------------------------------------------ run ----

const { db, dbPath } = openDatabase();

const json = (value) => JSON.stringify(value);
const timestamp = now();

function toSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

try {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM "Question"').get().n;

  if (existing > 0 && !force) {
    console.log(`Database already contains ${existing} questions.`);
    console.log("Re-run with `npm run db:seed -- --force` to wipe and re-seed.");
    process.exitCode = 0;
  } else {
    db.exec("BEGIN");
    try {
      if (force) {
        // Order matters only for readability; cascades handle the rest.
        for (const table of [
          "QuestionTag", "QuestionMark", "Question", "Tag",
          "AttemptQuestion", "Result", "ExamAttempt",
          "DifficultyDistribution", "ExamTemplate",
          "ImportJob", "AuditLog",
          "Topic", "Subject", "Category",
          "User",
        ]) {
          db.exec(`DELETE FROM "${table}";`);
        }
        console.log("Cleared existing data (--force).");
      }

      // ---- users
      const usersByRole = {};
      for (const user of USERS) {
        const id = newId();
        db.prepare(
          'INSERT INTO "User" ("id","email","password","name","role","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?)',
        ).run(id, user.email, bcrypt.hashSync(user.password, 10), user.name, user.role, timestamp, timestamp);
        usersByRole[user.role] = id;
        console.log(`  user  ${user.email.padEnd(30)} ${user.role}`);
      }
      const authorId = usersByRole.INSTRUCTOR;

      // ---- taxonomy
      const subjectIds = {};
      const topicIds = {};
      for (const category of TAXONOMY) {
        const categoryId = newId();
        db.prepare(
          'INSERT INTO "Category" ("id","slug","name","code","description","subjectCount","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?)',
        ).run(
          categoryId, category.slug, category.name, category.code,
          category.description, category.subjects.length, timestamp, timestamp,
        );

        for (const subject of category.subjects) {
          const subjectId = newId();
          db.prepare(
            'INSERT INTO "Subject" ("id","slug","name","categoryId","createdAt","updatedAt") VALUES (?,?,?,?,?,?)',
          ).run(subjectId, subject.slug, subject.name, categoryId, timestamp, timestamp);
          subjectIds[subject.slug] = subjectId;

          for (const topic of subject.topics) {
            const topicId = newId();
            db.prepare(
              'INSERT INTO "Topic" ("id","slug","name","subjectId","createdAt","updatedAt") VALUES (?,?,?,?,?,?)',
            ).run(topicId, topic.slug, topic.name, subjectId, timestamp, timestamp);
            topicIds[topic.slug] = topicId;
          }
        }
      }
      console.log(`  taxonomy  ${Object.keys(subjectIds).length} subjects, ${Object.keys(topicIds).length} topics`);

      // ---- questions
      const tagIds = {};
      for (const tagName of [...new Set(QUESTIONS.flatMap((q) => q.tags || []))]) {
        const slug = toSlug(tagName);
        const tagId = newId();
        db.prepare(
          'INSERT INTO "Tag" ("id","slug","name","createdAt","updatedAt") VALUES (?,?,?,?,?)',
        ).run(tagId, slug, tagName, timestamp, timestamp);
        tagIds[tagName] = tagId;
      }

      const insertQuestion = db.prepare(`
        INSERT INTO "Question"
          ("id","questionId","questionText","categoryId","subjectId","topicId","difficulty","questionType",
           "options","correctOptionIndices","explanation","marks","negativeMarks","tags","learningObjectives",
           "source","authorId","status","publishedAt","archivedAt","importId","canonicalIndices","createdAt","updatedAt")
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `);

      let index = 0;
      for (const question of QUESTIONS) {
        index += 1;
        const subjectId = subjectIds[question.subject];
        const topicId = topicIds[question.topic];
        const categorySlug = TAXONOMY.find((c) =>
          c.subjects.some((s) => s.slug === question.subject),
        )?.slug;
        const categoryRow = categorySlug
          ? db.prepare('SELECT "id" FROM "Category" WHERE "slug" = ?').get(categorySlug)
          : null;

        const marks = MARKS[question.difficulty] ?? 1;
        const id = newId();
        insertQuestion.run(
          id,
          `Q${String(index).padStart(5, "0")}`,
          question.text,
          categoryRow ? categoryRow.id : null,
          subjectId,
          topicId,
          question.difficulty,
          question.type,
          json(question.options),
          json(question.correct),
          question.explanation,
          marks,
          Math.round(marks * 25) / 100,
          json(question.tags || []),
          null,
          "seed",
          authorId,
          "PUBLISHED",
          timestamp,
          null,
          null,
          json(question.options.map((_, i) => i)),
          timestamp,
          timestamp,
        );

        for (const tagName of question.tags || []) {
          db.prepare(
            'INSERT OR IGNORE INTO "QuestionTag" ("questionId","tagId") VALUES (?,?)',
          ).run(id, tagIds[tagName]);
        }
      }
      console.log(`  questions ${QUESTIONS.length} published`);

      // ---- exam templates
      const insertTemplate = db.prepare(`
        INSERT INTO "ExamTemplate"
          ("id","slug","name","categoryId","subjectId","topicWeights","totalQuestions","durationMinutes",
           "marksPerQuestion","negativeMarking","difficultyDistribution","randomizeQuestions","randomizeOptions",
           "avoidPreviouslySeen","allowReuse","autoSubmitOnExpiry","passThresholdPercent","description","isPublic",
           "publishedAt","createdAt","updatedAt")
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `);

      for (const template of TEMPLATES) {
        const templateId = newId();
        const categoryRow = template.category
          ? db.prepare('SELECT "id" FROM "Category" WHERE "slug" = ?').get(template.category)
          : null;
        const subjectRow = template.subject
          ? db.prepare('SELECT "id" FROM "Subject" WHERE "slug" = ?').get(template.subject)
          : null;

        insertTemplate.run(
          templateId,
          template.slug,
          template.name,
          categoryRow ? categoryRow.id : null,
          subjectRow ? subjectRow.id : null,
          null,
          template.totalQuestions,
          template.durationMinutes,
          template.marksPerQuestion,
          template.negativeMarking ? 1 : 0,
          json(template.difficultyDistribution || {}),
          template.randomizeQuestions ? 1 : 0,
          template.randomizeOptions ? 1 : 0,
          0, 0,
          1,
          template.passThresholdPercent,
          template.description,
          1,
          timestamp,
          timestamp,
          timestamp,
        );

        let order = 0;
        for (const [difficulty, weight] of Object.entries(template.difficultyDistribution || {})) {
          db.prepare(
            'INSERT INTO "DifficultyDistribution" ("id","templateId","difficulty","weight","order") VALUES (?,?,?,?,?)',
          ).run(newId(), templateId, difficulty, weight, order);
          order += 1;
        }
      }
      console.log(`  templates ${TEMPLATES.length} published`);

      db.prepare(
        'INSERT INTO "AuditLog" ("id","userId","action","entity","entityId","details","ipAddress","userAgent","createdAt") VALUES (?,?,?,?,?,?,?,?,?)',
      ).run(
        newId(), usersByRole.ADMINISTRATOR, "SEED", "Database", null,
        json({ questions: QUESTIONS.length, templates: TEMPLATES.length }),
        null, null, timestamp,
      );

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    console.log(`\nSeeded ${dbPath}`);
    console.log("\nDemo accounts:");
    for (const user of USERS) {
      console.log(`  ${user.role.padEnd(14)} ${user.email.padEnd(30)} ${user.password}`);
    }
    console.log("\nNext: npm run dev");
  }
} catch (error) {
  console.error("Seed failed.");
  console.error(error);
  process.exitCode = 1;
} finally {
  db.close();
}
