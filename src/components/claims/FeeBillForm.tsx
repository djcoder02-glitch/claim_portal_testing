import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUpdateClaimSilent, type Claim } from "@/hooks/useClaims";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { format } from "date-fns";

// Number to words converter
const numberToWords = (num: number): string => {
  if (num === 0) return "Zero";
  
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  
  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "");
  };
  
  const convertIndianNumbering = (n: number): string => {
    if (n === 0) return "Zero";
    
    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const remainder = n % 1000;
    
    let result = "";
    if (crore > 0) result += convertLessThanThousand(crore) + " Crore ";
    if (lakh > 0) result += convertLessThanThousand(lakh) + " Lakh ";
    if (thousand > 0) result += convertLessThanThousand(thousand) + " Thousand ";
    if (remainder > 0) result += convertLessThanThousand(remainder);
    
    return result.trim();
  };
  
  return convertIndianNumbering(Math.floor(num));
};


interface FeeBillFormProps {
  claim: Claim;
}

// ==================== CONFIGURATION SECTION ====================
// This is where you configure all fields, labels, and text
// Easy to modify without touching the JSX below!

// Fixed text configuration
const FIXED_TEXT = {
  pageTitle: "Fee Bill Details",
  companyName: "GONDALIA",
  companyTagline: "INSURANCE SURVEYORS\nAND LOSS ASSESSORS",
  companyServices: "MARINE • FIRE • MISCELLANEOUS • ENGINEERING",
  invoiceHeader: "TAX INVOICE",
  surveyorName: "RAJESH GONDALIA",
  surveyorCredentials: "M. Tech Chemical - IITB, Chem. Engg.\nLic. No. SLA 36961\nExp. Date: 29.04.26",
  footerPan: "PAN No.: ABIPG3168J",
  footerGst: "GST REG. No. 27ABIPG3168J1ZH",
  footerPhone: "9820213308",
  footerEmail: "info@gondaliasurveyor.in",
  footerWebsite: "gondalia.surveyor@gmail.com",
  footerAddress: "117, Reena Complex,\nRamdev Nagar Road,\nVidyavihar (W) Mumbai - 400086",
  signatureText: "For GONDALIA INSURANCE SURVEYORS\nAND LOSS ASSESSORS",
  surveyorTitle: "SURVEYOR",
};

const INVOICE_HEADER_FIELDS = [
  {
    key: 'invoice_number',
    type: 'editable' as const,
    defaultValue: '',
    placeholder: '25-26/46764'
  },
  {
    key: 'invoice_date',
    type: 'editable' as const,
    defaultValue: format(new Date(), 'dd.MM.yyyy')
  }
];

const CLIENT_FIELDS = [
  { key: 'client_name', defaultValue: '', placeholder: 'Bajaj General Insurance Ltd.' },
  { key: 'client_address_1', defaultValue: '', placeholder: 'Rustomji Aspire Bldg., 2nd Flr., Everad Nagar 2,' },
  { key: 'client_address_2', defaultValue: '', placeholder: 'Near to Apex Honda Showroom, Off. Eastern Exp.' },
  { key: 'client_address_3', defaultValue: '', placeholder: 'Highway, Near Priyadarshini Circle, Sion, Mumbai - 400022.' },
  { key: 'client_gstn', defaultValue: '', placeholder: 'GSTN NO.27AABCB5730G1ZX' },
];

const INVOICE_LINE_ITEMS = [
  {
    key: 'description',
    label: 'DESCRIPTION',
    type: 'textarea' as const,
    defaultValue: '',
    placeholder: 'Being fees for survey of the damaged property of Mrs. NIKITA BABLU MAHATRE...',
    rowSpan: 1
  },
  {
    key: 'survey_fees',
    label: 'Survey fees',
    type: 'editable' as const,
    defaultValue: 0,
    calculationNote: true,
  },
  {
    key: 'survey_fees_note',
    type: 'note' as const,
    defaultValue: '',
    placeholder: '(Fees on 1,33,465.00)'
  },
  {
    key: 'conveyance_charges',
    label: 'Conveyance charges',
    type: 'editable' as const,
    defaultValue: 0,
  },
  {
    key: 'photographs',
    label: 'Photographs',
    type: 'editable' as const,
    defaultValue: 0,
    hsn_sac: '997162',
  },
];

// ==================== END CONFIGURATION SECTION ====================

export const FeeBillForm = ({ claim }: FeeBillFormProps) => {
  const [autoSaving, setAutoSaving] = useState(false);
  const updateClaimMutation = useUpdateClaimSilent();
  const isCalculating = useRef(false);

  const buildDefaultValues = () => {
  const defaults: any = {};

  // Initialize invoice header
  defaults.invoice_number = claim.form_data?.invoice_number || '';
  defaults.invoice_date = claim.form_data?.invoice_date || format(new Date(), 'dd.MM.yyyy');

  // Initialize client fields
  CLIENT_FIELDS.forEach(field => {
    defaults[field.key] = claim.form_data?.[field.key] || field.defaultValue || '';
  });

  // Initialize claim number from claim data
  defaults.claim_number = claim.claim_number || '';

  // Initialize line items
  defaults.description = claim.form_data?.description || '';
  defaults.survey_fees = claim.form_data?.survey_fees || 0;
  defaults.survey_fees_note = claim.form_data?.survey_fees_note || '';
  defaults.conveyance_charges = claim.form_data?.conveyance_charges || 0;
  defaults.photographs = claim.form_data?.photographs || 0;

  // Initialize calculated fields
  defaults.taxable_value = claim.form_data?.taxable_value || 0;
  defaults.cgst = claim.form_data?.cgst || 0;
  defaults.sgst = claim.form_data?.sgst || 0;
  defaults.igst = claim.form_data?.igst || 0;
  defaults.round_off = claim.form_data?.round_off || 0;
  defaults.total_invoice_value = claim.form_data?.total_invoice_value || 0;

  return defaults;
};


  const { register, watch, setValue, getValues } = useForm({
    defaultValues: buildDefaultValues()
  });

// Auto-calculation and auto-save logic
useEffect(() => {
  let autoSaveTimer: NodeJS.Timeout | null = null;
  
  const subscription = watch((value) => {
    if (isCalculating.current) return;
    
    isCalculating.current = true;
    
    setTimeout(() => {
      const surveyFees = Number(value.survey_fees) || 0;
      const conveyance = Number(value.conveyance_charges) || 0;
      const photos = Number(value.photographs) || 0;
      const taxableValue = surveyFees + conveyance + photos;
      
      const igstValue = Number(value.igst) || 0;
      let cgst = 0, sgst = 0;
      
      if (igstValue === 0) {
        cgst = taxableValue * 0.09;
        sgst = taxableValue * 0.09;
      }
      
      const totalBeforeRound = taxableValue + cgst + sgst + igstValue;
      const roundedTotal = Math.round(totalBeforeRound);
      const roundOff = roundedTotal - totalBeforeRound;
      
      setValue('taxable_value', Number(taxableValue.toFixed(2)));
      setValue('cgst', Number(cgst.toFixed(2)));
      setValue('sgst', Number(sgst.toFixed(2)));
      setValue('round_off', Number(roundOff.toFixed(2)));
      setValue('total_invoice_value', roundedTotal);
      
      setTimeout(() => {
        isCalculating.current = false;
      }, 100);
      
      setAutoSaving(true);
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      
      autoSaveTimer = setTimeout(() => {
        saveData({
          ...value,
          taxable_value: Number(taxableValue.toFixed(2)),
          cgst: Number(cgst.toFixed(2)),
          sgst: Number(sgst.toFixed(2)),
          round_off: Number(roundOff.toFixed(2)),
          total_invoice_value: roundedTotal
        });
      }, 1000);
    }, 0);
  });
  
  return () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    subscription.unsubscribe();
  };
}, [watch, setValue]);


  // Save on unmount (when navigating away)
useEffect(() => {
  return () => {
    // Component is unmounting, no need to save here as watch already handles it
  };
}, []);


  const saveData = async (data: any) => {
    try {
      await updateClaimMutation.mutateAsync({
        id: claim.id,
        updates: {
          form_data: {
            ...claim.form_data,
            ...data
          }
        }
      });
      setAutoSaving(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaving(false);
    }
  };


  const handleManualSave = async () => {
    await saveData(getValues());
    toast.success("Fee bill details saved!");
  };

  return (
    <div className="space-y-6">
      <style>{`
        .excel-table {
          border-collapse: collapse;
          width: 100%;
          border: 2px solid #000;
          background: white;
        }
        .excel-table td, .excel-table th {
          border: 1px solid #000;
          padding: 8px 12px;
          font-size: 14px;
        }
        .excel-table th {
          background-color: #e8e8e8;
          font-weight: 600;
          text-align: left;
        }
        .excel-table input, .excel-table textarea {
          border: none;
          background: transparent;
          width: 100%;
          padding: 4px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
        }
        .excel-table input:focus, .excel-table textarea:focus {
          outline: 2px solid #4a90e2;
          outline-offset: -2px;
          background: #fff;
        }
        .label-cell {
          background-color: #f5f5f5;
          font-weight: 500;
          vertical-align: middle;
          white-space: nowrap;
        }
        .value-cell {
          background-color: white;
          vertical-align: middle;
        }
        .merged-header {
          background-color: #d9d9d9;
          font-weight: bold;
          text-align: center;
          font-size: 16px;
          padding: 12px;
          border: 2px solid #000;
        }
        .total-row {
          background-color: #fff2cc;
          font-weight: bold;
          border-top: 2px solid #000;
        }
        .final-total-row {
          background-color: #c6efce;
          font-weight: bold;
          font-size: 16px;
          border: 2px solid #000;
        }
        .colon-separator {
          width: 20px;
          text-align: center;
          background-color: #f5f5f5;
        }
        .number-cell {
          text-align: right;
          font-family: 'Courier New', monospace;
        }
        .read-only-cell {
          background-color: #f1f5f9;
          cursor: not-allowed;
        }
      `}</style>

      {/* Save Controls */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-3xl font-bold text-gray-800">{FIXED_TEXT.pageTitle}</h2>
        <div className="flex items-center gap-3">
          {autoSaving && (
            <span className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Auto-saving...
            </span>
          )}
          <Button onClick={handleManualSave} size="sm" className="bg-slate-700 hover:bg-slate-800">
            <Save className="w-4 h-4 mr-2" />
            Save Manually
          </Button>
        </div>
      </div>

      {/* Header Card - Company Branding */}
      <Card className="bg-white overflow-hidden border-2 border-gray-300">
        <div className="p-6 bg-gradient-to-r from-gray-100 to-gray-200">
          <div className="flex justify-between items-start">
            {/* Left: Logo Placeholder */}
            <div className="w-32 h-32 border-4 border-gray-400 flex items-center justify-center bg-white">
              <span className="text-xs text-gray-500 text-center">Company<br/>LOGO</span>
            </div>
            
            {/* Center: Company Info */}
            <div className="flex-1 text-center px-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">{FIXED_TEXT.companyName}</h1>
              <p className="text-lg font-semibold text-gray-700 whitespace-pre-line">{FIXED_TEXT.companyTagline}</p>
              <p className="text-sm text-gray-600 mt-2">{FIXED_TEXT.companyServices}</p>
            </div>
            
            {/* Right: Surveyor Details */}
            <div className="text-right text-sm">
              <p className="font-bold">{FIXED_TEXT.surveyorName}</p>
              <p className="text-gray-600 whitespace-pre-line">{FIXED_TEXT.surveyorCredentials}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Invoice Header and Details */}
      <Card className="bg-white overflow-hidden border-2 border-gray-300">
        <div className="merged-header">{FIXED_TEXT.invoiceHeader}</div>
        <table className="excel-table">
          <tbody>
            {/* Invoice Number and Date */}
            <tr>
              <td className="label-cell" style={{ width: '20%' }}>Invoice Number</td>
              <td className="value-cell" style={{ width: '30%' }}>
                <input {...register("invoice_number")} placeholder="25-26/46764" />
              </td>
              <td className="label-cell" style={{ width: '20%' }}>Invoice Date</td>
              <td className="value-cell" style={{ width: '30%' }}>
                <input {...register("invoice_date")} type="date" />
              </td>
            </tr>
            
            {/* Client Details Section */}
            <tr>
              <td className="label-cell" colSpan={4} style={{ backgroundColor: '#e8e8e8', fontWeight: 'bold' }}>
                CLIENT DETAILS
              </td>
            </tr>
            
            {/* Client Name */}
            <tr>
              <td className="label-cell">Name</td>
              <td className="value-cell" colSpan={3}>
                <input {...register("client_name")} placeholder="Bajaj General Insurance Ltd." />
              </td>
            </tr>
            
            {/* Address Lines */}
            <tr>
              <td className="label-cell">Address</td>
              <td className="value-cell" colSpan={3}>
                <input {...register("client_address_1")} placeholder="Rustomji Aspire Bldg., 2nd Flr., Everad Nagar 2," className="mb-1" />
                <input {...register("client_address_2")} placeholder="Near to Apex Honda Showroom, Off. Eastern Exp." className="mb-1" />
                <input {...register("client_address_3")} placeholder="Highway, Near Priyadarshini Circle, Sion, Mumbai - 400022." />
              </td>
            </tr>
            
            {/* GSTN */}
            <tr>
              <td className="label-cell">GSTN</td>
              <td className="value-cell" colSpan={3}>
                <input {...register("client_gstn")} placeholder="GSTN NO.27AABCB5730G1ZX" />
              </td>
            </tr>
            
            {/* Claim Number */}
            <tr>
              <td className="label-cell">Claim No.</td>
              <td className="value-cell" colSpan={3}>
                <input {...register("claim_number")} readOnly className="read-only-cell" />
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Invoice Line Items Table */}
      <Card className="bg-white overflow-hidden border-2 border-gray-300">
        <table className="excel-table">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>DESCRIPTION</th>
              <th style={{ width: '20%' }}>HSN / SAC CODE</th>
              <th style={{ width: '30%', textAlign: 'right' }}>AMOUNT (RS.)</th>
            </tr>
          </thead>
          <tbody>
            {/* Description (Large textarea) */}
            <tr>
              <td className="value-cell" rowSpan={1}>
                <textarea 
                  {...register("description")} 
                  rows={6}
                  placeholder="Being fees for survey of the damaged property of Mrs. NIKITA BABLU MAHATRE, Flat No. 502, A Wing, Sarvoday Datta CHS, Near Reti Bunder, Mota Gaon, Dombivali, Dist. Thane, on 23.10.2025. Insured with Bajaj General Insurance Ltd., Mumbai."
                  style={{ resize: 'vertical' }}
                />
              </td>
              <td className="value-cell"></td>
              <td className="value-cell"></td>
            </tr>
            
            {/* Survey Fees */}
            <tr>
              <td className="value-cell">
                <div>Survey fees</div>
                <input 
                  {...register("survey_fees_note")} 
                  placeholder="(Fees on 1,33,465.00)"
                  className="text-sm text-gray-600"
                  style={{ marginTop: '4px' }}
                />
              </td>
              <td className="value-cell"></td>
              <td className="value-cell number-cell">
                <input 
                  {...register("survey_fees", { valueAsNumber: true })} 
                  type="number" 
                  step="0.01"
                  className="number-cell"
                />
              </td>
            </tr>
            
            {/* Conveyance Charges */}
            <tr>
              <td className="value-cell">Conveyance charges</td>
              <td className="value-cell"></td>
              <td className="value-cell number-cell">
                <input 
                  {...register("conveyance_charges", { valueAsNumber: true })} 
                  type="number" 
                  step="0.01"
                  className="number-cell"
                />
              </td>
            </tr>
            
            {/* Photographs */}
            <tr>
              <td className="value-cell">Photographs</td>
              <td className="value-cell">997162</td>
              <td className="value-cell number-cell">
                <input 
                  {...register("photographs", { valueAsNumber: true })} 
                  type="number" 
                  step="0.01"
                  className="number-cell"
                />
              </td>
            </tr>
            
            {/* Taxable Value */}
            <tr className="total-row">
              <td className="label-cell" style={{ fontWeight: 'bold' }}>Taxable value</td>
              <td className="value-cell">997162</td>
              <td className="value-cell number-cell" style={{ fontWeight: 'bold' }}>
                <input 
                  value={watch('taxable_value')?.toFixed(2) || '0.00'} 
                  readOnly 
                  className="number-cell read-only-cell"
                  style={{ fontWeight: 'bold' }}
                />
              </td>
            </tr>
            
            {/* CGST 9% */}
            <tr>
              <td className="value-cell">CGST (09%)</td>
              <td className="value-cell"></td>
              <td className="value-cell number-cell">
                <input 
                  value={watch('cgst')?.toFixed(2) || '0.00'} 
                  readOnly 
                  className="number-cell read-only-cell"
                />
              </td>
            </tr>
            
            {/* SGST 9% */}
            <tr>
              <td className="value-cell">SGST (09%)</td>
              <td className="value-cell"></td>
              <td className="value-cell number-cell">
                <input 
                  value={watch('sgst')?.toFixed(2) || '0.00'} 
                  readOnly 
                  className="number-cell read-only-cell"
                />
              </td>
            </tr>
            
            {/* IGST 18% - Editable for inter-state */}
            <tr>
              <td className="value-cell">IGST (18%)</td>
              <td className="value-cell"></td>
              <td className="value-cell number-cell">
                <input 
                  {...register("igst", { valueAsNumber: true })} 
                  type="number" 
                  step="0.01"
                  className="number-cell"
                  placeholder="0.00"
                />
              </td>
            </tr>
            
            {/* Round Off */}
            <tr>
              <td className="value-cell">Round off</td>
              <td className="value-cell"></td>
              <td className="value-cell number-cell">
                <input 
                  value={watch('round_off')?.toFixed(2) || '0.00'} 
                  readOnly 
                  className="number-cell read-only-cell"
                />
              </td>
            </tr>
            
            {/* Total Invoice Value */}
            <tr className="final-total-row">
              <td className="label-cell" style={{ fontWeight: 'bold', fontSize: '16px' }}>
                Total Invoice Value (In Figure)
              </td>
              <td className="value-cell"></td>
              <td className="value-cell number-cell" style={{ fontWeight: 'bold', fontSize: '16px' }}>
                <input 
                  value={watch('total_invoice_value')?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'} 
                  readOnly 
                  className="number-cell read-only-cell"
                  style={{ fontWeight: 'bold', fontSize: '16px' }}
                />
              </td>
            </tr>
            
            {/* Total in Words */}
            <tr>
              <td colSpan={3} className="value-cell" style={{ fontWeight: 'bold', padding: '12px' }}>
                Total Invoice Value (In Words): Rupees {numberToWords(Number(watch('total_invoice_value')) || 0)} Only.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Footer with Signature */}
      <Card className="bg-white overflow-hidden border-2 border-gray-300">
        <table className="excel-table">
          <tbody>
            <tr>
              <td style={{ padding: '40px 20px', textAlign: 'right' }}>
                <div style={{ display: 'inline-block', textAlign: 'center' }}>
                  <div style={{ whiteSpace: 'pre-line', marginBottom: '60px', fontSize: '14px', fontWeight: '500' }}>
                    {FIXED_TEXT.signatureText}
                  </div>
                  <div style={{ borderTop: '2px solid #000', paddingTop: '10px', minWidth: '200px' }}>
                    <strong>{FIXED_TEXT.surveyorTitle}</strong>
                  </div>
                </div>
              </td>
            </tr>
            
            {/* Footer Details */}
            <tr>
              <td style={{ padding: '20px', backgroundColor: '#f5f5f5', fontSize: '12px' }}>
                <div className="flex justify-between items-center">
                  <div>
                    <div>{FIXED_TEXT.footerPan} | {FIXED_TEXT.footerGst}</div>
                    <div className="mt-1">{FIXED_TEXT.footerPhone} | {FIXED_TEXT.footerEmail}</div>
                    <div>{FIXED_TEXT.footerWebsite}</div>
                  </div>
                  <div className="text-right whitespace-pre-line">
                    {FIXED_TEXT.footerAddress}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
};