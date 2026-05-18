import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";

export default function DrawCreate() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    prizeName: "",
    prizeDescription: "",
    prizeEstimatedValueETB: "",
    ticketPriceETB: "",
    ticketPoolSize: "",
    startDate: "",
    endDate: "",
    drawDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState([]);

  const onChange = (k) => (e) => {
    let value = e.target.value;
    if (k === "slug") value = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setForm({ ...form, [k]: value });
  };

  // Auto-generate slug from title
  const onTitleChange = (e) => {
    const title = e.target.value;
    const autoSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80);
    setForm({ ...form, title, slug: form.slug || autoSlug });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors([]);
    setSubmitting(true);

    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        prizeName: form.prizeName,
        prizeEstimatedValueETB: Number(form.prizeEstimatedValueETB),
        ticketPriceETB: Number(form.ticketPriceETB),
        ticketPoolSize: Number(form.ticketPoolSize),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      };
      if (form.description) payload.description = form.description;
      if (form.prizeDescription) payload.prizeDescription = form.prizeDescription;
      if (form.drawDate) payload.drawDate = new Date(form.drawDate).toISOString();

      const { data } = await api.post("/admin/draws", payload);
      nav(`/draws/${data.draw._id}`);
    } catch (err) {
      const respErrors = err.response?.data?.errors;
      if (respErrors?.length) {
        setErrors(respErrors);
      } else {
        setError(err.response?.data?.message || "Failed to create draw");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <header className="mb-6">
        <Link to="/draws" className="text-sm text-text-muted hover:text-text mb-2 inline-flex items-center gap-1">
          ← Draws
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Create new draw</h1>
        <p className="text-sm text-text-muted">The draw starts as a <strong>draft</strong>. Activate it to start selling tickets.</p>
      </header>

      <form onSubmit={submit} className="bg-white border border-border rounded-xl p-6 space-y-5 max-w-3xl">
        <Section title="Basics">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Title" required value={form.title} onChange={onTitleChange} placeholder="Launch Draw — iPhone 15 Pro Max" />
            <Field
              label="Slug"
              required
              value={form.slug}
              onChange={onChange("slug")}
              hint="URL-friendly identifier (lowercase, hyphens)"
              placeholder="launch-iphone-100k"
            />
          </div>
          <Textarea label="Description" value={form.description} onChange={onChange("description")} hint="Optional. Shown on the public draw page." rows="3" />
        </Section>

        <Section title="Prize">
          <Field label="Prize name" required value={form.prizeName} onChange={onChange("prizeName")} placeholder="iPhone 15 Pro Max + 100,000 ETB" />
          <Textarea label="Prize description" value={form.prizeDescription} onChange={onChange("prizeDescription")} hint="Optional. Detailed description of the prize." rows="3" />
          <Field
            label="Prize value (ETB)"
            type="number"
            required
            value={form.prizeEstimatedValueETB}
            onChange={onChange("prizeEstimatedValueETB")}
            min="1"
            placeholder="250000"
          />
        </Section>

        <Section title="Tickets">
          <div className="grid md:grid-cols-2 gap-4">
            <Field
              label="Ticket price (ETB)"
              type="number"
              required
              value={form.ticketPriceETB}
              onChange={onChange("ticketPriceETB")}
              min="1"
              placeholder="500"
            />
            <Field
              label="Total tickets in pool"
              type="number"
              required
              value={form.ticketPoolSize}
              onChange={onChange("ticketPoolSize")}
              min="1"
              max="1000000"
              placeholder="5000"
            />
          </div>
          {form.ticketPriceETB && form.ticketPoolSize && (
            <div className="bg-surface border border-border rounded-md p-3 text-xs text-text-muted">
              Max revenue if fully sold: <strong className="text-text">{(Number(form.ticketPriceETB) * Number(form.ticketPoolSize)).toLocaleString()} ETB</strong>
            </div>
          )}
        </Section>

        <Section title="Schedule">
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Start date" type="datetime-local" required value={form.startDate} onChange={onChange("startDate")} />
            <Field label="End date (sales close)" type="datetime-local" required value={form.endDate} onChange={onChange("endDate")} />
            <Field label="Draw date" type="datetime-local" value={form.drawDate} onChange={onChange("drawDate")} hint="Optional. When the winner is selected." />
          </div>
        </Section>

        {error && (
          <div className="bg-danger-light text-danger text-sm px-4 py-3 rounded-md">{error}</div>
        )}
        {errors.length > 0 && (
          <div className="bg-danger-light text-danger text-sm px-4 py-3 rounded-md">
            <div className="font-medium mb-1">Please fix:</div>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              {errors.map((e, i) => <li key={i}><strong>{e.field}:</strong> {e.message}</li>)}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Link to="/draws" className="text-sm px-4 py-2 text-text-muted hover:text-text">Cancel</Link>
          <button
            type="submit"
            disabled={submitting}
            className="text-sm bg-brand text-white font-medium px-5 py-2 rounded-md hover:bg-brand-dark transition disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create draft"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-4 pb-4">
      <h3 className="font-semibold text-sm">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, required, hint, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        {...props}
        className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2 text-sm"
      />
      {hint && <p className="text-[11px] text-text-faint mt-1">{hint}</p>}
    </div>
  );
}

function Textarea({ label, hint, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5">{label}</label>
      <textarea
        {...props}
        className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2 text-sm resize-none"
      />
      {hint && <p className="text-[11px] text-text-faint mt-1">{hint}</p>}
    </div>
  );
}