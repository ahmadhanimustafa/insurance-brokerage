# Reference Numbers Guide

## Where to Input Reference Numbers

### Location
**Finance Module → Inbox Tab → Create Schedule**

When you click "➕ Create Schedule" on any policy, you'll see a highlighted **Reference Numbers** section at the top of the modal.

## Visual Layout

```
┌────────────────────────────────────────────────────────────────┐
│ Create Finance Schedule – [Policy Number]                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Policy Info: Client, Insurance, Premium, etc.]                │
│                                                                 │
│ ╔═══════════════════════════════════════════════════════════╗ │
│ ║ 📋 Reference Numbers (Yellow highlighted box)            ║ │
│ ╠═══════════════════════════════════════════════════════════╣ │
│ ║                                                           ║ │
│ ║  Internal Reference Number    |  External Invoice Number ║ │
│ ║  (Blue border - large input)  |  (Green border - large)  ║ │
│ ║  ┌─────────────────────────┐  |  ┌───────────────────┐  ║ │
│ ║  │ Your internal ref       │  |  │ External ref       │  ║ │
│ ║  └─────────────────────────┘  |  └───────────────────┘  ║ │
│ ║  📝 Your company's internal   |  📨 Reference from      ║ │
│ ║     reference number          |     insurance company   ║ │
│ ║                                                           ║ │
│ ║  ℹ️ Note: Both fields are optional. Internal reference   ║ │
│ ║     is for your company's tracking. External reference   ║ │
│ ║     is for references from insurance companies or other  ║ │
│ ║     partners.                                            ║ │
│ ╚═══════════════════════════════════════════════════════════╝ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Payment Type & Generate Installments                    │   │
│ │ [Payment Type dropdown] [Generate button]               │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Field Details

### 🔵 Internal Reference Number (Left)
- **Purpose**: Your company's internal reference/tracking number
- **Style**: Blue border, large input field
- **Example**: "INV-2025-001", "REF-POL-123"
- **Optional**: Yes
- **Who uses it**: Your finance team for internal tracking

### 🟢 External Invoice Number (Right)
- **Purpose**: Reference number from insurance company or external party
- **Style**: Green border, large input field
- **Example**: "INS-XYZ-789", "EXT-REF-456"
- **Optional**: Yes
- **Who uses it**: Reference from insurance companies, brokers, or partners

## Design Features

### ✨ Visual Emphasis
- **Yellow background** on the entire Reference Numbers section
- **Bold yellow border** (2px) around the fieldset
- **Large input fields** for better visibility
- **Color-coded borders**: Blue for Internal, Green for External
- **Icons**: 📋 for section, 📝 for internal, 📨 for external
- **Info box**: Light blue alert with usage instructions

### 🎯 Why This Design?
The prominent yellow background and bold borders ensure you won't miss these important fields when creating a finance schedule. The color-coding helps distinguish between internal (blue) and external (green) references at a glance.

## Usage Examples

### Scenario 1: Direct Business with Insurance Company
```
Internal Reference: "FIN-2025-001-DIRECT"
External Invoice: "ALLIANZ-INV-2025-123"
```

### Scenario 2: Non-Direct Business via Broker
```
Internal Reference: "BROKER-REF-045"
External Invoice: "ABC-BROKER-INV-789"
```

### Scenario 3: No External Reference Available
```
Internal Reference: "INT-POL-156"
External Invoice: (leave blank)
```

## Automatic Invoice Numbers

**Important**: These reference numbers are **different** from the auto-generated invoice numbers!

- **Internal Reference Number**: Manual input field for your tracking
- **External Invoice Number**: Manual input field for external references
- **Auto-generated Invoice Numbers**: System creates these automatically for each entry
  - Format: `0001/1/DN/12/25` (Running/Installment/DN-CN/Month/Year)
  - Shown in Payment Schedule table
  - Cannot be edited (system-controlled)

## Where to View After Creation

After creating a schedule:
1. Go to **Finance Schedules (Per Policy)** tab to see summary
2. Go to **Payment Schedule (Installment Level)** tab to see:
   - Auto-generated invoice numbers per entry
   - Paid amounts, outstanding, receipts
   - Payment and upload buttons

---

## Quick Steps

1. **Navigate**: Finance → Inbox → Find policy → Click "Create Schedule"
2. **Reference Numbers Section** (yellow box at top)
3. **Fill in** (optional):
   - Internal Reference: Your company's tracking number
   - External Invoice: Partner/insurance company reference
4. **Continue** with payment type and generate installments
5. **Save** to create schedule

The reference numbers will be saved with the schedule and available for reporting and tracking purposes.
