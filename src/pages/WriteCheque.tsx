import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAsync } from "../hooks";
import {
  createCheque,
  findOrCreatePayee,
  incrementChequeNumber,
  listAccounts,
  listPayees,
  listTemplates,
  setAccountNextCheque,
} from "../db/repos";
import { amountToWords } from "../lib/amountToWords";
import { formatCurrency, todayISO } from "../lib/format";
import { resolveFields, type ChequeData } from "../lib/render";
import ChequePreview from "../components/ChequePreview";
import { renderChequePdf } from "../lib/pdf";
import { openPdfForPrint } from "../lib/output";
import { PREVIEW_PX_PER_MM } from "../lib/units";
import { normalizeFields } from "../lib/checkFields";

export default function WriteCheque() {
  const { data: accounts } = useAsync(listAccounts, []);
  const { data: templates } = useAsync(listTemplates, []);
  const { data: payees, reload: reloadPayees } = useAsync(listPayees, []);

  const [accountId, setAccountId] = useState<number | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [payeeName, setPayeeName] = useState("");
  const [amount, setAmount] = useState("");
  const [dateISO, setDateISO] = useState(todayISO());
  const [memo, setMemo] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [crossed, setCrossed] = useState(false);
  const [bearer, setBearer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const account = accounts?.find((a) => a.id === accountId) ?? null;
  const template = templates?.find((t) => t.id === templateId) ?? null;

  // Default to the first template so a cheque can be printed right away —
  // no account setup required.
  useEffect(() => {
    if (templateId == null && templates && templates.length) setTemplateId(templates[0].id);
  }, [templates, templateId]);

  // An account is entirely optional. If the user picks one, adopt its default
  // template and running cheque number as conveniences.
  useEffect(() => {
    if (!account) return;
    if (account.default_template_id) setTemplateId(account.default_template_id);
    if (account.next_cheque_no) setChequeNo(account.next_cheque_no);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const amountNum = parseFloat(amount) || 0;
  const currency = account?.currency ?? "PHP";
  const words = useMemo(
    () =>
      amountToWords(amountNum, {
        currency:
          currency === "USD"
            ? { one: "DOLLAR", many: "DOLLARS" }
            : currency === "EUR"
              ? { one: "EURO", many: "EUROS" }
              : { one: "PESO", many: "PESOS" },
      }),
    [amountNum, currency],
  );

  const chequeData: ChequeData = {
    payeeName: payeeName || "—",
    amount: amountNum,
    amountWords: words,
    dateISO,
    memo,
    accountName: account?.account_name ?? "",
    currency,
    crossed,
    bearer,
  };

  const previewTemplate = template
    ? { ...template, fields: normalizeFields(template.fields ?? []) }
    : null;

  const values = previewTemplate
    ? { ...resolveFields(previewTemplate.fields, chequeData), __crossed: crossed ? "1" : "0" }
    : {};

  // The only things required to write a cheque are a payee and an amount.
  // A template is additionally required to *print* (it defines field positions).
  const hasContent = !!payeeName.trim() && amountNum > 0 && !busy;
  const canPrint = hasContent && !!previewTemplate;

  async function persist(): Promise<number> {
    const payeeId = await findOrCreatePayee(payeeName);
    const id = await createCheque({
      account_id: account?.id ?? null,
      template_id: template?.id ?? null,
      payee_id: payeeId,
      payee_name: payeeName.trim(),
      cheque_number: chequeNo,
      cheque_date: dateISO,
      amount: amountNum,
      amount_words: words,
      memo,
      currency,
      crossed: crossed ? 1 : 0,
      bearer: bearer ? 1 : 0,
      status: "issued",
    });
    // If an account is attached, advance its running cheque number.
    if (account && chequeNo) {
      await setAccountNextCheque(account.id, incrementChequeNumber(chequeNo));
    }
    await reloadPayees();
    return id;
  }

  function resetForNext() {
    setPayeeName("");
    setAmount("");
    setMemo("");
    setDateISO(todayISO());
    setCrossed(false);
    setBearer(false);
    // chequeNo will refresh from the reloaded account
  }

  async function onSave() {
    if (!hasContent) return;
    setBusy(true);
    try {
      await persist();
      setFlash("Cheque saved to the register.");
      resetForNext();
    } finally {
      setBusy(false);
    }
  }

  async function onPrint() {
    if (!hasContent || !previewTemplate) {
      if (!previewTemplate) alert("Pick a cheque template first (create one under Templates).");
      return;
    }
    setBusy(true);
    try {
      await persist();
      const bytes = await renderChequePdf(previewTemplate, values);
      await openPdfForPrint(bytes, `cheque_${chequeNo || "print"}.pdf`);
      setFlash("Cheque saved and opened for printing.");
      resetForNext();
    } finally {
      setBusy(false);
    }
  }

  const noTemplates = templates && templates.length === 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Write a Cheque</h1>
          <p>Pick a template, type the payee and amount, and print. That's it.</p>
        </div>
      </div>

      {noTemplates && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="empty">
            <div className="big">▭</div>
            To print, you first need a cheque template (it tells the app where each
            value goes on the paper). <Link to="/templates">Create a template →</Link>
          </div>
        </div>
      )}

      {flash && (
        <div
          className="card"
          style={{ marginBottom: 18, borderColor: "var(--success)", background: "var(--success-soft)" }}
        >
          {flash}
        </div>
      )}

      <div className="split">
        <div className="card">
          <div className="row">
            <div className="field">
              <label>Cheque Template</label>
              <select
                value={templateId ?? ""}
                onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— None —</option>
                {(templates ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Account (optional)</label>
              <select
                value={accountId ?? ""}
                onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">— None —</option>
                {(accounts ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_name} ({a.bank_short_name ?? "?"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Pay to the Order of</label>
            <input
              list="payee-list"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="Payee name"
            />
            <datalist id="payee-list">
              {(payees ?? []).map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          <div className="row">
            <div className="field">
              <label>Amount ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Amount in Words</label>
            <div
              className="mono"
              style={{
                padding: "9px 11px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surface-2)",
                minHeight: 38,
              }}
            >
              {words}
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label>Cheque No.</label>
              <input
                className="mono"
                value={chequeNo}
                onChange={(e) => setChequeNo(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Memo / Purpose</label>
              <input value={memo} onChange={(e) => setMemo(e.target.value)} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, margin: "6px 0 16px" }}>
            <label className="checkbox">
              <input type="checkbox" checked={crossed} onChange={(e) => setCrossed(e.target.checked)} />
              Crossed (A/C Payee only)
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={bearer} onChange={(e) => setBearer(e.target.checked)} />
              Bearer
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn" onClick={onSave} disabled={!hasContent}>
              Save to Register
            </button>
            <button className="btn primary" onClick={onPrint} disabled={!canPrint}>
              Save & Print
            </button>
            {hasContent && !previewTemplate && (
              <span className="hint" style={{ margin: 0 }}>
                Select a template to print.
              </span>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Live Preview</h2>
          {previewTemplate ? (
            <div style={{ overflowX: "auto" }}>
              <ChequePreview
                template={previewTemplate}
                values={values}
                scale={PREVIEW_PX_PER_MM}
              />
            </div>
          ) : (
            <div className="empty">
              <div className="big">▭</div>
              Select a template to preview the printed cheque.{" "}
              <Link to="/templates">Manage templates →</Link>
            </div>
          )}
          <div className="hint" style={{ marginTop: 12 }}>
            Amount: <strong>{formatCurrency(amountNum, currency)}</strong>
          </div>
        </div>
      </div>
    </>
  );
}
