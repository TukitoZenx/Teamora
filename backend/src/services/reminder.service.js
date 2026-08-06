const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Workspace = require('../models/Workspace');
const logger = require('../utils/logger');

let transporter = null;

const initTransporter = () => {
  if (transporter) return;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    logger.warn('SMTP credentials not fully configured. Email reminders will not be sent.');
    return;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
};

const sendReminderEmail = async (email, taskTitle, workspaceName, reminderNumber, totalReminders) => {
  if (!transporter) return;

  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || '"Teamora Collab" <noreply@example.com>';

  const mailOptions = {
    from,
    to: email,
    subject: `Task Reminder: ${taskTitle}`,
    text: `You have a reminder for the task: "${taskTitle}" in workspace "${workspaceName}".\n\nThis is reminder ${reminderNumber} of ${totalReminders}.\n\nPlease check your workspace for more details.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #4f46e5;">Task Reminder</h2>
        <p>You have a reminder for the task: <strong>${taskTitle}</strong> in workspace <strong>${workspaceName}</strong>.</p>
        <p style="color: #6b7280; font-size: 14px;">This is reminder ${reminderNumber} of ${totalReminders}.</p>
        <p>Please log in to your Teamora Collab workspace to view more details.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Sent reminder email to ${email} for task "${taskTitle}"`);
  } catch (error) {
    logger.error(`Failed to send reminder email to ${email}`, error);
  }
};

const processReminders = async () => {
  if (!transporter) return;

  try {
    const now = new Date();

    // Find workspaces that have tasks with active reminders
    const workspaces = await Workspace.find({
      'tasks.reminderEnabled': true,
      'tasks.nextReminderTime': { $lte: now },
      $expr: { $lt: ['$tasks.remindersSent', '$tasks.reminderLimit'] }
    });

    for (const workspace of workspaces) {
      let workspaceUpdated = false;

      for (const task of workspace.tasks) {
        if (
          task.reminderEnabled &&
          task.nextReminderTime &&
          task.nextReminderTime <= now &&
          task.remindersSent < task.reminderLimit &&
          task.reminderEmail
        ) {
          // Send the email
          await sendReminderEmail(
            task.reminderEmail,
            task.title,
            workspace.name,
            task.remindersSent + 1,
            task.reminderLimit
          );

          // Update task counters
          task.remindersSent += 1;

          // Calculate next reminder time if limit not reached
          if (task.remindersSent < task.reminderLimit && task.reminderGapMinutes > 0) {
            const nextTime = new Date(task.nextReminderTime.getTime() + task.reminderGapMinutes * 60000);
            task.nextReminderTime = nextTime;
          } else {
            task.reminderEnabled = false; // Disable when limit reached
          }

          workspaceUpdated = true;
        }
      }

      if (workspaceUpdated) {
        await workspace.save();
      }
    }
  } catch (error) {
    logger.error('Error processing reminders', error);
  }
};

const startReminderService = () => {
  initTransporter();

  if (transporter) {
    logger.info('Starting email reminder cron service');
    // Run every minute
    cron.schedule('* * * * *', processReminders);
  } else {
    logger.info('Skipping email reminder cron service (SMTP missing)');
  }
};

module.exports = {
  startReminderService
};
