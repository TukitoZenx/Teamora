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

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const sendReminderEmail = async (email, taskTitle, workspaceName, reminderNumber, totalReminders) => {
  if (!transporter) return;
  if (!/^\S+@\S+\.\S+$/.test(String(email || ''))) return;

  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || '"Teamora Collab" <noreply@example.com>';
  const safeTitle = escapeHtml(taskTitle);
  const safeWorkspace = escapeHtml(workspaceName);

  const mailOptions = {
    from,
    to: email,
    subject: `Task Reminder: ${String(taskTitle || '').replace(/[\r\n]+/g, ' ')}`,
    text: `You have a reminder for the task: "${taskTitle}" in workspace "${workspaceName}".\n\nThis is reminder ${reminderNumber} of ${totalReminders}.\n\nPlease check your workspace for more details.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #4f46e5;">Task Reminder</h2>
        <p>You have a reminder for the task: <strong>${safeTitle}</strong> in workspace <strong>${safeWorkspace}</strong>.</p>
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
      archivedAt: null,
      tasks: {
        $elemMatch: {
          reminderEnabled: true,
          reminderEmail: { $gt: '' },
          nextReminderTime: { $lte: now },
          completed: { $ne: true },
          status: { $ne: 'completed' }
        }
      }
    });

    for (const workspace of workspaces) {
      let workspaceUpdated = false;

      for (const task of workspace.tasks) {
        if (
          task.reminderEnabled &&
          task.nextReminderTime &&
          task.nextReminderTime <= now &&
          task.remindersSent < task.reminderLimit &&
          task.reminderEmail &&
          !task.completed &&
          task.status !== 'completed'
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

const getTaskEndDate = (task) => {
  if (!task?.date) return null;
  const rawTime = task.endTime || '';
  if (rawTime && /^\d{1,2}:\d{2}/.test(rawTime)) {
    const normalized = rawTime.length === 5 ? `${rawTime}:00` : rawTime;
    const dated = new Date(`${task.date}T${normalized}`);
    if (!Number.isNaN(dated.getTime())) return dated;
  }
  const endOfDay = new Date(`${task.date}T23:59:59`);
  return Number.isNaN(endOfDay.getTime()) ? null : endOfDay;
};

const processOverdueTasks = async () => {
  try {
    const now = Date.now();
    const workspaces = await Workspace.find({
      archivedAt: null,
      tasks: {
        $elemMatch: {
          completed: { $ne: true },
          status: { $ne: 'completed' },
          date: { $exists: true, $ne: '' }
        }
      }
    }).select('tasks');

    for (const workspace of workspaces) {
      let changed = false;
      for (const task of workspace.tasks) {
        if (task.completed || task.status === 'completed') continue;
        const end = getTaskEndDate(task);
        if (!end || end.getTime() > now) continue;
        task.completed = true;
        task.status = 'completed';
        task.reminderEnabled = false;
        changed = true;
      }
      if (changed) await workspace.save();
    }
  } catch (error) {
    logger.error('Error auto-completing overdue tasks', error);
  }
};

const startReminderService = () => {
  initTransporter();

  cron.schedule('* * * * *', async () => {
    await processOverdueTasks();
    if (transporter) await processReminders();
  });

  if (transporter) {
    logger.info('Starting email reminder + task completion cron service');
  } else {
    logger.info('Starting task completion cron service (SMTP missing — email reminders skipped)');
  }
};

module.exports = {
  startReminderService
};
