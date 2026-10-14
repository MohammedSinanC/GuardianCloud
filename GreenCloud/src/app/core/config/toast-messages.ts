/**
 * Centralized toast message configuration.
 *
 * Maps action keys to their success/error messages.
 * Used by HttpClientService.toastAction and ToasterService.
 *
 * Usage in components:
 *   this.httpClient.post('/inquiries', data, { toastAction: 'inquiry.create' })
 *
 * Usage manual:
 *   this.toaster.success('inquiry.create')  → resolves to "Inquiry created successfully."
 */

export interface ToastMessagePair {
  success: string;
  error: string;
}

export type ToastActionKey = keyof typeof TOAST_MESSAGES;

/** Dot-notation action keys, e.g. 'inquiry.create', 'quotation.send' */
type DotPrefix<T> = { [K in keyof T & string]: `${K}.${string & keyof T[K]}` };
type ActionKey = DotPrefix<typeof TOAST_MESSAGES>[keyof typeof TOAST_MESSAGES];

export const TOAST_MESSAGES = {
  // ===== INQUIRY =====
  inquiry: {
    create:   { success: 'Inquiry created successfully.',          error: 'Unable to create the inquiry. Please try again.' },
    update:   { success: 'Inquiry updated successfully.',          error: 'Unable to update the inquiry. Please try again.' },
    delete:   { success: 'Inquiry deleted successfully.',          error: 'Unable to delete the inquiry.' },
    draft:    { success: 'Inquiry saved as draft.',                 error: 'Unable to save the inquiry as draft.' },
    approve:  { success: 'Inquiry approved successfully.',         error: 'Unable to approve the inquiry.' },
    reject:   { success: 'Inquiry rejected.',                       error: 'Unable to reject the inquiry.' },
    submit:   { success: 'Inquiry submitted successfully.',        error: 'Unable to submit the inquiry.' },
    cancel:   { success: 'Inquiry cancelled successfully.',        error: 'Unable to cancel the inquiry.' },
  },

  // ===== QUOTATION =====
  quotation: {
    create:   { success: 'Quotation created successfully.',        error: 'Unable to create the quotation.' },
    update:   { success: 'Quotation updated successfully.',        error: 'Unable to update the quotation.' },
    send:     { success: 'Quotation sent successfully to the customer.', error: 'Unable to send the quotation. Please check the details and try again.' },
    approve:  { success: 'Quotation approved successfully.',       error: 'Unable to approve the quotation.' },
    reject:   { success: 'Quotation rejected.',                    error: 'Unable to reject the quotation.' },
    cancel:   { success: 'Quotation cancelled successfully.',      error: 'Unable to cancel the quotation.' },
  },

  // ===== SCHEDULE =====
  schedule: {
    save:     { success: 'Service schedule saved successfully.',   error: 'Unable to save the service schedule.' },
    update:   { success: 'Service schedule updated successfully.', error: 'Unable to update the service schedule.' },
    delete:   { success: 'Schedule deleted successfully.',         error: 'Unable to delete the schedule.' },
  },

  // ===== PAYMENT SCHEDULE =====
  paymentSchedule: {
    generate: { success: 'Payment schedule generated successfully.', error: 'Unable to generate the payment schedule. Please check the payment configuration.' },
    update:   { success: 'Payment schedule updated successfully.',   error: 'Unable to update the payment schedule.' },
  },

  // ===== WORKFLOW ACTIONS (generic key, resolved dynamically) =====
  workflow: {
    execute:  { success: '', error: 'Unable to complete the workflow action.' },
  },

  // ===== USER MANAGEMENT =====
  user: {
    create:   { success: 'User created successfully.',             error: 'Unable to create the user.' },
    update:   { success: 'User updated successfully.',             error: 'Unable to update the user.' },
    delete:   { success: 'User deleted successfully.',             error: 'Unable to delete the user.' },
    activate: { success: 'User activated successfully.',           error: 'Unable to activate the user.' },
    deactivate: { success: 'User deactivated successfully.',       error: 'Unable to deactivate the user.' },
  },

  // ===== ROLE MANAGEMENT =====
  role: {
    create:   { success: 'Role created successfully.',             error: 'Unable to create the role.' },
    update:   { success: 'Role updated successfully.',             error: 'Unable to update the role.' },
    delete:   { success: 'Role deleted successfully.',             error: 'Unable to delete the role.' },
  },

  // ===== ERP: LEAD =====
  lead: {
    create:   { success: 'Lead created successfully.',                   error: 'Unable to create the lead.' },
    update:   { success: 'Lead updated successfully.',                   error: 'Unable to update the lead.' },
    delete:   { success: 'Lead deleted successfully.',                   error: 'Unable to delete the lead.' },
    submit:   { success: 'Lead submitted for approval.',                 error: 'Unable to submit the lead. Check mandatory fields.' },
    approve:  { success: 'Lead approved successfully. Customer and inquiry created.', error: 'Unable to approve the lead.' },
    reject:   { success: 'Lead rejected.',                               error: 'Unable to reject the lead.' },
  },

  // ===== ERP: SITE INSPECTION =====
  inspection: {
    create:   { success: 'Site inspection created successfully.',     error: 'Unable to create the site inspection.' },
    update:   { success: 'Site inspection saved successfully.',       error: 'Unable to save the site inspection.' },
    submit:   { success: 'Inspection submitted for approval.',        error: 'Unable to submit the inspection. Check mandatory fields.' },
    approve:  { success: 'Inspection approved successfully. Quotation created.', error: 'Unable to approve the inspection.' },
    reject:   { success: 'Inspection rejected.',                      error: 'Rejection reason is required.' },
  },

  // ===== ERP: CUSTOMER =====
  customer: {
    create:   { success: 'Customer created successfully.',               error: 'Unable to create the customer.' },
    update:   { success: 'Customer updated successfully.',               error: 'Unable to update the customer.' },
  },

  // ===== ERP: INVOICE =====
  invoice: {
    create:   { success: 'Invoice created successfully.',                error: 'Invoice could not be created. The quotation must be approved first.' },
    update:   { success: 'Invoice items updated successfully.',          error: 'Unable to update the invoice items.' },
    paymentType: { success: 'Payment type selected — terms loaded and payment schedule generated.', error: 'Unable to select the payment type.' },
    collect:  { success: 'Payment recorded — receipt generated, schedule and ledger updated.', error: 'Unable to record the payment.' },
    approve:  { success: 'Invoice approved successfully. Ledger updated.', error: 'Unable to approve the invoice.' },
    cancel:   { success: 'Invoice cancelled successfully.',              error: 'Unable to cancel the invoice.' },
    send:     { success: 'Invoice sent to customer successfully.',       error: 'Unable to send the invoice to the customer.' },
  },

  // ===== ERP: WORK ORDER =====
  workOrder: {
    create:   { success: 'Work order created successfully.',        error: 'Unable to create the work order. The quotation must be approved first.' },
    update:   { success: 'Work order updated successfully.',        error: 'Unable to update the work order.' },
    assign:   { success: 'Work assigned successfully.',             error: 'Unable to assign the work. Check team and schedule details.' },
    submit:   { success: 'Work order submitted for approval.',      error: 'Unable to submit the work order.' },
    approve:  { success: 'Work order approved successfully.',       error: 'Unable to approve the work order.' },
    reject:   { success: 'Work order rejected.',                    error: 'Rejection reason is required.' },
    start:    { success: 'Work started successfully.',              error: 'Unable to start the work.' },
    complete: { success: 'Work completed successfully. Invoice drafted.', error: 'Unable to complete the work. Completion notes are required.' },
  },

  // ===== MASTER DATA =====
  masterData: {
    create:   { success: 'Record saved successfully.',             error: 'Unable to save the record.' },
    update:   { success: 'Record updated successfully.',           error: 'Unable to update the record.' },
    delete:   { success: 'Record deleted successfully.',           error: 'Unable to delete the record.' },
  },

  // ===== COMPANY =====
  company: {
    update:   { success: 'Company information saved successfully.', error: 'Unable to save company information.' },
  },

  // ===== WEBSITE CONTENT =====
  content: {
    update:   { success: 'Website content saved successfully.',    error: 'Unable to save website content.' },
  },
} as const;

/**
 * Resolve a dot-notation action key to its toast messages.
 * e.g. 'quotation.send' → { success: 'Quotation sent...', error: 'Unable to send...' }
 *
 * If the key is a workflow action name (e.g. 'SUBMIT', 'APPROVE'), it returns
 * a dynamically generated message based on the action name.
 */
export function resolveToastMessages(actionKey: string): ToastMessagePair | null {
  // Try direct lookup: 'quotation.send' → TOAST_MESSAGES.quotation.send
  const parts = actionKey.split('.');
  if (parts.length === 2) {
    const [group, action] = parts;
    const groupMessages = TOAST_MESSAGES[group as keyof typeof TOAST_MESSAGES];
    if (groupMessages && typeof groupMessages === 'object') {
      const msg = (groupMessages as Record<string, ToastMessagePair>)[action];
      if (msg) return msg;
    }
  }

  // Workflow action names → dynamic message
  const workflowMessage = resolveWorkflowActionMessage(actionKey);
  if (workflowMessage) return workflowMessage;

  return null;
}

/**
 * Convert workflow action names like 'SUBMIT', 'APPROVE', 'REJECT' etc.
 * into meaningful toast messages.
 */
function resolveWorkflowActionMessage(actionName: string): ToastMessagePair | null {
  const upper = actionName.toUpperCase();

  const workflowMessages: Record<string, ToastMessagePair> = {
    SUBMIT:            { success: 'Inquiry submitted successfully.',      error: 'Unable to submit the inquiry.' },
    APPROVE:           { success: 'Inquiry approved successfully.',     error: 'Unable to approve the inquiry.' },
    REJECT:            { success: 'Inquiry rejected.',                   error: 'Unable to reject the inquiry.' },
    CANCEL:            { success: 'Inquiry cancelled successfully.',      error: 'Unable to cancel the inquiry.' },
    SAVE_AS_DRAFT:     { success: 'Inquiry saved as draft.',             error: 'Unable to save as draft.' },
    START_INSPECTION:  { success: 'Inspection started successfully.',     error: 'Unable to start inspection.' },
    COMPLETE_INSPECTION:{ success: 'Inspection completed successfully.',  error: 'Unable to complete inspection.' },
    SCHEDULE_SERVICE:  { success: 'Service scheduled successfully.',      error: 'Unable to schedule service.' },
    ASSIGN_TECHNICIAN: { success: 'Technician assigned successfully.',    error: 'Unable to assign technician.' },
    START_SERVICE:     { success: 'Service work started successfully.',   error: 'Unable to start service work.' },
    COMPLETE_SERVICE:  { success: 'Service completed successfully.',      error: 'Unable to complete service.' },
    CLOSE:             { success: 'Inquiry closed successfully.',         error: 'Unable to close the inquiry.' },
  };

  return workflowMessages[upper] || null;
}

/**
 * Resolve workflow action name to a human-readable label.
 * e.g. 'SUBMIT' → 'Submit', 'SAVE_AS_DRAFT' → 'Save as Draft'
 */
export function resolveWorkflowActionLabel(actionName: string): string {
  return actionName
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}
