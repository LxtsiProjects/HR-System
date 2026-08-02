"use client";
import React, { useState, useEffect, useCallback } from "react";
import { supabase, STORAGE_BUCKET } from "../lib/supabaseClient";
import {
  LayoutDashboard, Users, Wallet, FileText, ShieldCheck, LogOut,
  Plus, Trash2, Pencil, Printer, X, Lock, Sparkles, ChevronRight,
  CircleCheck, TriangleAlert, Eye, EyeOff, Building2, Upload, Download, Paperclip
} from "lucide-react";

function cx(...a) { return a.filter(Boolean).join(" "); }
function currency(n, symbol) {
  const num = Number(n) || 0;
  return symbol + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function can(profile, key) {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return !!(profile.permissions && profile.permissions[key]);
}

const PERMISSION_DEFS = [
  { key: "manageEmployees", label: "Manage employees", desc: "Add, edit, and remove employee records" },
  { key: "runPayroll", label: "Run payroll", desc: "Calculate and generate monthly payslips" },
  { key: "viewPayslips", label: "View & print payslips", desc: "Open and print any employee's payslip history" },
];

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState("dashboard");
  const [employees, setEmployees] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [settings, setSettings] = useState({ company: "Your Company", currency: "R", tax_rate: 10, pension_rate: 5, overtime_multiplier: 1.5, standard_monthly_hours: 160 });
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (!sess) setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async () => {
    if (!session?.user) return;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (error) { console.error(error); return; }
    setProfile(data);
  }, [session]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const loadAll = useCallback(async () => {
    const [{ data: emp }, { data: pay }, { data: set }] = await Promise.all([
      supabase.from("employees").select("*").order("name"),
      supabase.from("payslips").select("*").order("period", { ascending: false }),
      supabase.from("payroll_settings").select("*").eq("id", 1).single(),
    ]);
    setEmployees(emp || []);
    setPayslips(pay || []);
    if (set) setSettings(set);
  }, []);

  useEffect(() => {
    if (profile && profile.active) loadAll();
  }, [profile, loadAll]);

  if (loading) {
    return <div style={{ minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p className="mono" style={{ color: "var(--ink-soft)", fontSize: 13 }}>Loading…</p>
    </div>;
  }

  if (!session) {
    return <LoginScreen settings={settings} />;
  }

  if (!profile) {
    return <div style={{ minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p className="mono" style={{ color: "var(--ink-soft)", fontSize: 13 }}>Setting up your account…</p>
    </div>;
  }

  if (!profile.active) {
    return (
      <div style={{ minHeight: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ padding: 24, width: 340, textAlign: "center" }}>
          <TriangleAlert size={20} color="var(--brick)" />
          <p style={{ fontSize: 13.5, margin: "10px 0 16px" }}>Your account has been disabled. Contact your admin.</p>
          <button className="btn btn-outline" onClick={() => supabase.auth.signOut()}>Log out</button>
        </div>
      </div>
    );
  }

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { key: "employees", label: "Employees", icon: Users, show: true },
    { key: "payroll", label: "Payroll", icon: Wallet, show: can(profile, "runPayroll") },
    { key: "payslips", label: "Payslips", icon: FileText, show: can(profile, "viewPayslips") || can(profile, "runPayroll") },
    { key: "team", label: "Team & access", icon: ShieldCheck, show: profile.role === "admin" },
    { key: "roadmap", label: "Roadmap", icon: Sparkles, show: true },
  ].filter(i => i.show);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: 200, background: "var(--ink)", padding: "18px 10px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 18px", color: "#fff" }}>
          <Building2 size={18} />
          <span className="disp" style={{ fontSize: 14, fontWeight: 700 }}>{settings.company}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {navItems.map(item => (
            <div key={item.key} className={cx("navitem", view === item.key && "active")} onClick={() => setView(item.key)}>
              <item.icon size={16} />{item.label}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 10, marginTop: 10 }}>
          <div style={{ color: "#fff", fontSize: 12, fontWeight: 600, padding: "0 8px" }}>{profile.username}</div>
          <div style={{ color: "#9AA79F", fontSize: 11, padding: "0 8px 8px", textTransform: "capitalize" }}>{profile.role}</div>
          <div className="navitem" onClick={() => supabase.auth.signOut()}><LogOut size={16} />Log out</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
        {toast && (
          <div style={{ position: "fixed", top: 20, right: 20, zIndex: 60, padding: "10px 16px", borderRadius: 4, background: toast.type === "error" ? "var(--brick)" : "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            {toast.type === "error" ? <TriangleAlert size={15} /> : <CircleCheck size={15} />}{toast.msg}
          </div>
        )}
        {view === "dashboard" && <Dashboard employees={employees} payslips={payslips} settings={settings} />}
        {view === "employees" && <EmployeesView employees={employees} reload={loadAll} canEdit={can(profile, "manageEmployees")} showToast={showToast} settings={settings} />}
        {view === "payroll" && can(profile, "runPayroll") && (
          <PayrollView employees={employees} payslips={payslips} reload={loadAll} settings={settings} setSettings={setSettings} isAdmin={profile.role === "admin"} showToast={showToast} />
        )}
        {view === "payslips" && <PayslipsView payslips={payslips} employees={employees} settings={settings} />}
        {view === "team" && profile.role === "admin" && <TeamView session={session} showToast={showToast} />}
        {view === "roadmap" && <RoadmapView />}
      </div>
    </div>
  );
}

function LoginScreen({ settings }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message);
  };
  const onKeyDown = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 340, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Building2 size={20} color="var(--accent)" />
          <span className="disp" style={{ fontSize: 17, fontWeight: 700 }}>{settings.company}</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 20px" }}>Sign in to the HR workspace</p>
        <div onKeyDown={onKeyDown}>
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          </div>
          <div style={{ marginBottom: 8, position: "relative" }}>
            <label className="field-label">Password</label>
            <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} />
            <span onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 10, top: 29, cursor: "pointer", color: "var(--ink-soft)" }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </span>
          </div>
          {error && <p style={{ color: "var(--brick)", fontSize: 12, margin: "8px 0" }}>{error}</p>}
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={submit} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card" style={{ padding: "16px 18px", flex: 1 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--ink-soft)", fontWeight: 600 }}>{label}</div>
      <div className="disp" style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 2px" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{sub}</div>}
    </div>
  );
}

function Dashboard({ employees, payslips, settings }) {
  const active = employees.filter(e => e.status === "Active");
  const monthlyTotal = active.reduce((s, e) => {
    const base = e.pay_type === "hourly"
      ? Number(e.hourly_rate || 0) * Number(settings.standard_monthly_hours || 160)
      : Number(e.monthly_salary || 0);
    return s + base + Number(e.allowances || 0);
  }, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const generatedThisMonth = payslips.filter(p => p.period === thisMonth).length;
  const byDept = {};
  active.forEach(e => { byDept[e.department || "Unassigned"] = (byDept[e.department || "Unassigned"] || 0) + 1; });

  return (
    <div>
      <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Dashboard</h2>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 18px" }}>Snapshot of your workforce and payroll.</p>
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Active employees" value={active.length} sub={`${employees.length - active.length} inactive`} />
        <StatCard label="Monthly payroll" value={currency(monthlyTotal, settings.currency)} sub="Gross, before deductions" />
        <StatCard label="Payslips this month" value={generatedThisMonth} sub={thisMonth} />
      </div>
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Headcount by department</h3>
        {Object.keys(byDept).length === 0 && <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No employees added yet.</p>}
        {Object.entries(byDept).map(([dept, count]) => (
          <div key={dept} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 110, fontSize: 12.5, flexShrink: 0 }}>{dept}</div>
            <div style={{ flex: 1, background: "var(--paper-2)", borderRadius: 3, height: 10 }}>
              <div style={{ width: `${Math.min(100, (count / active.length) * 100)}%`, background: "var(--accent)", height: 10, borderRadius: 3 }} />
            </div>
            <div style={{ width: 24, fontSize: 12, textAlign: "right" }}>{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeesView({ employees, reload, canEdit, showToast, settings }) {
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const blank = { name: "", email: "", position: "", department: "", employment_type: "Full-time", pay_type: "salary", join_date: "", monthly_salary: "", hourly_rate: "", allowances: "0", status: "Active" };

  const save = async (data) => {
    if (!data.name?.trim()) { showToast("Name is required.", "error"); return; }
    const payload = {
      name: data.name, email: data.email || null, position: data.position || null, department: data.department || null,
      employment_type: data.employment_type, pay_type: data.pay_type, join_date: data.join_date || null,
      monthly_salary: Number(data.monthly_salary) || 0, hourly_rate: Number(data.hourly_rate) || 0,
      allowances: Number(data.allowances) || 0, status: data.status,
    };
    let error;
    if (data.id) {
      ({ error } = await supabase.from("employees").update(payload).eq("id", data.id));
    } else {
      ({ error } = await supabase.from("employees").insert(payload));
    }
    if (error) { showToast(error.message, "error"); return; }
    await reload();
    setModal(null);
    showToast(data.id ? "Employee updated." : "Employee added.");
  };

  const remove = async (id) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) { showToast(error.message, "error"); return; }
    await reload();
    setConfirmDelete(null);
    showToast("Employee removed.");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Employees</h2>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>{employees.length} on record</p>
        </div>
        {canEdit && <button className="btn btn-primary" onClick={() => setModal({ ...blank })}><Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Add employee</button>}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table>
          <thead><tr><th>Name</th><th>Position</th><th>Department</th><th>Pay type</th><th>Rate</th><th>Status</th>{canEdit && <th></th>}</tr></thead>
          <tbody>
            {employees.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--ink-soft)" }}>No employees yet. Add your first one to get started.</td></tr>}
            {employees.map(emp => (
              <tr key={emp.id}>
                <td style={{ fontWeight: 600 }}>{emp.name}</td>
                <td>{emp.position || "—"}</td>
                <td>{emp.department || "—"}</td>
                <td style={{ textTransform: "capitalize" }}>{emp.pay_type || "salary"}</td>
                <td className="mono">
                  {emp.pay_type === "hourly"
                    ? `${currency(emp.hourly_rate, settings.currency)}/hr`
                    : currency(Number(emp.monthly_salary || 0) + Number(emp.allowances || 0), settings.currency)}
                </td>
                <td><span className={cx("badge", emp.status === "Active" ? "badge-green" : "badge-gray")}>{emp.status}</span></td>
                {canEdit && (
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Pencil size={14} style={{ cursor: "pointer", marginRight: 10 }} onClick={() => setModal({ ...emp })} />
                    <Trash2 size={14} style={{ cursor: "pointer", color: "var(--brick)" }} onClick={() => setConfirmDelete(emp.id)} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 440, padding: 22, maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{modal.id ? "Edit employee" : "Add employee"}</h3>
              <X size={16} style={{ cursor: "pointer" }} onClick={() => setModal(null)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1/3" }}><label className="field-label">Full name</label><input type="text" value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} /></div>
              <div style={{ gridColumn: "1/3" }}><label className="field-label">Email</label><input type="email" value={modal.email || ""} onChange={e => setModal({ ...modal, email: e.target.value })} /></div>
              <div><label className="field-label">Position</label><input type="text" value={modal.position || ""} onChange={e => setModal({ ...modal, position: e.target.value })} /></div>
              <div><label className="field-label">Department</label><input type="text" value={modal.department || ""} onChange={e => setModal({ ...modal, department: e.target.value })} /></div>
              <div>
                <label className="field-label">Employment type</label>
                <select value={modal.employment_type} onChange={e => setModal({ ...modal, employment_type: e.target.value })}>
                  <option>Full-time</option><option>Part-time</option><option>Contract</option>
                </select>
              </div>
              <div><label className="field-label">Join date</label><input type="date" value={modal.join_date || ""} onChange={e => setModal({ ...modal, join_date: e.target.value })} /></div>
              <div>
                <label className="field-label">Pay type</label>
                <select value={modal.pay_type || "salary"} onChange={e => setModal({ ...modal, pay_type: e.target.value })}>
                  <option value="salary">Fixed monthly salary</option>
                  <option value="hourly">Hourly rate</option>
                </select>
              </div>
              {(modal.pay_type || "salary") === "hourly" ? (
                <div><label className="field-label">Hourly rate</label><input type="number" value={modal.hourly_rate || ""} onChange={e => setModal({ ...modal, hourly_rate: e.target.value })} /></div>
              ) : (
                <div><label className="field-label">Monthly salary</label><input type="number" value={modal.monthly_salary || ""} onChange={e => setModal({ ...modal, monthly_salary: e.target.value })} /></div>
              )}
              <div><label className="field-label">Allowances</label><input type="number" value={modal.allowances} onChange={e => setModal({ ...modal, allowances: e.target.value })} /></div>
              <div style={{ gridColumn: "1/3" }}>
                <label className="field-label">Status</label>
                <select value={modal.status} onChange={e => setModal({ ...modal, status: e.target.value })}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>
            {modal.id ? <EmployeeDocuments employeeId={modal.id} showToast={showToast} canEdit={canEdit} /> : (
              <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 14 }}>Save this employee first, then reopen it to attach documents.</p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => save(modal)}>Save</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 340, padding: 20 }}>
            <p style={{ fontSize: 13.5, margin: "0 0 16px" }}>Remove this employee? Their past payslips stay on record.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => remove(confirmDelete)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DOC_TYPES = ["ID card", "Qualification", "Sick note", "Contract", "Other"];
const MAX_DOC_BYTES = 4 * 1024 * 1024;

function EmployeeDocuments({ employeeId, showToast, canEdit }) {
  const [docs, setDocs] = useState([]);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("employee_documents").select("*").eq("employee_id", employeeId).order("uploaded_at", { ascending: false });
    setDocs(data || []);
  }, [employeeId]);
  useEffect(() => { load(); }, [load]);

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) { showToast(`"${file.name}" is too large — keep files under 4MB.`, "error"); return; }
    setUploading(true);
    try {
      const path = `${employeeId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("employee_documents").insert({
        employee_id: employeeId, doc_type: docType, file_name: file.name, storage_path: path,
      });
      if (dbErr) throw dbErr;
      await load();
      showToast(`${docType} uploaded.`);
    } catch (err) {
      showToast(err.message || "Couldn't upload that file.", "error");
    } finally {
      setUploading(false);
    }
  };

  const download = async (doc) => {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(doc.storage_path, 60);
    if (error || !data) { showToast("Couldn't open that file.", "error"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (doc) => {
    await supabase.storage.from(STORAGE_BUCKET).remove([doc.storage_path]);
    await supabase.from("employee_documents").delete().eq("id", doc.id);
    await load();
    showToast("Document removed.");
  };

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
      <label className="field-label" style={{ marginBottom: 8 }}>Documents</label>
      {docs.length === 0 && <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 10px" }}>No documents uploaded yet.</p>}
      {docs.map(doc => (
        <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--paper-2)" }}>
          <Paperclip size={13} color="var(--ink-soft)" style={{ flexShrink: 0 }} />
          <span className="badge badge-gray" style={{ flexShrink: 0 }}>{doc.doc_type}</span>
          <span style={{ fontSize: 12.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.file_name}</span>
          <Download size={14} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => download(doc)} />
          {canEdit && <Trash2 size={14} style={{ cursor: "pointer", color: "var(--brick)", flexShrink: 0 }} onClick={() => remove(doc)} />}
        </div>
      ))}
      {canEdit && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          <select value={docType} onChange={e => setDocType(e.target.value)} style={{ width: 150 }}>
            {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <label className="btn btn-outline" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Upload size={13} />{uploading ? "Uploading…" : "Upload file"}
            <input type="file" onChange={handleFile} disabled={uploading} style={{ display: "none" }} />
          </label>
          <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Max 4MB</span>
        </div>
      )}
    </div>
  );
}

function PayrollView({ employees, payslips, reload, settings, setSettings, isAdmin, showToast }) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [entries, setEntries] = useState({}); // employeeId -> {regular_hours, overtime_hours, absence_hours, late_hours, note}
  const [entriesDirty, setEntriesDirty] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  useEffect(() => setLocalSettings(settings), [settings]);
  const active = employees.filter(e => e.status === "Active");

  const loadEntries = useCallback(async () => {
    const { data } = await supabase.from("payroll_entries").select("*").eq("period", period);
    const map = {};
    (data || []).forEach(e => { map[e.employee_id] = e; });
    setEntries(map);
    setEntriesDirty(false);
  }, [period]);
  useEffect(() => { loadEntries(); }, [loadEntries]);

  const updateEntry = (empId, field, value) => {
    setEntries(prev => ({ ...prev, [empId]: { ...(prev[empId] || {}), [field]: value } }));
    setEntriesDirty(true);
  };

  const saveHours = async () => {
    setSavingHours(true);
    const rows = active.map(emp => {
      const e = entries[emp.id] || {};
      return {
        employee_id: emp.id, period,
        regular_hours: Number(e.regular_hours) || 0,
        overtime_hours: Number(e.overtime_hours) || 0,
        absence_hours: Number(e.absence_hours) || 0,
        late_hours: Number(e.late_hours) || 0,
        note: e.note || null,
      };
    });
    const { error } = await supabase.from("payroll_entries").upsert(rows, { onConflict: "employee_id,period" });
    setSavingHours(false);
    if (error) { showToast(error.message, "error"); return; }
    setEntriesDirty(false);
    showToast("Hours saved for this period.");
  };

  // hourly-equivalent rate: an employee's own hourly_rate, or a salaried employee's
  // monthly salary spread across the standard working hours for the month
  const hourlyEquivalent = (emp) => emp.pay_type === "hourly"
    ? Number(emp.hourly_rate || 0)
    : Number(emp.monthly_salary || 0) / Number(settings.standard_monthly_hours || 160);

  const computeFor = (emp) => {
    const e = entries[emp.id] || {};
    const rate = hourlyEquivalent(emp);
    const regularHours = Number(e.regular_hours) || 0;
    const overtimeHours = Number(e.overtime_hours) || 0;
    const absenceHours = Number(e.absence_hours) || 0;
    const lateHours = Number(e.late_hours) || 0;
    const allow = Number(emp.allowances || 0);

    const basicPay = emp.pay_type === "hourly" ? regularHours * rate : Number(emp.monthly_salary || 0);
    const overtimePay = overtimeHours * rate * Number(settings.overtime_multiplier || 1.5);
    const grossBeforeDeductions = basicPay + overtimePay + allow;

    const attendanceHours = absenceHours + lateHours;
    const attendanceDeduction = attendanceHours * rate;
    const adjustedGross = grossBeforeDeductions - attendanceDeduction;

    const tax = adjustedGross * (Number(settings.tax_rate || 0) / 100);
    const pension = adjustedGross * (Number(settings.pension_rate || 0) / 100);
    const net = adjustedGross - tax - pension;

    return { basicPay, overtimePay, allow, grossBeforeDeductions, attendanceHours, attendanceDeduction, adjustedGross, tax, pension, net, regularHours, overtimeHours };
  };

  const alreadyRun = payslips.some(p => p.period === period);

  const saveSettings = async () => {
    const { error } = await supabase.from("payroll_settings").update({
      company: localSettings.company, currency: localSettings.currency,
      tax_rate: Number(localSettings.tax_rate), pension_rate: Number(localSettings.pension_rate),
      overtime_multiplier: Number(localSettings.overtime_multiplier), standard_monthly_hours: Number(localSettings.standard_monthly_hours),
    }).eq("id", 1);
    if (error) { showToast(error.message, "error"); return; }
    setSettings(localSettings);
    showToast("Payroll settings saved.");
  };

  const runPayroll = async () => {
    if (active.length === 0) { showToast("Add active employees first.", "error"); return; }
    if (entriesDirty) { showToast("Save hours before running payroll.", "error"); return; }
    const rows = active.map(emp => {
      const c = computeFor(emp);
      return {
        employee_id: emp.id, employee_name: emp.name, position: emp.position, department: emp.department,
        period, pay_type: emp.pay_type || "salary",
        basic_salary: c.basicPay, allowances: c.allow,
        regular_hours: c.regularHours, overtime_hours: c.overtimeHours, overtime_pay: c.overtimePay,
        gross_pay: c.grossBeforeDeductions,
        attendance_deduction_hours: c.attendanceHours, attendance_deduction: c.attendanceDeduction,
        adjusted_gross: c.adjustedGross,
        tax_deduction: c.tax, pension_deduction: c.pension, net_pay: c.net,
      };
    });
    const { error: delErr } = await supabase.from("payslips").delete().eq("period", period);
    if (delErr) { showToast(delErr.message, "error"); return; }
    const { error: insErr } = await supabase.from("payslips").insert(rows);
    if (insErr) { showToast(insErr.message, "error"); return; }
    await reload();
    showToast(`Payroll run for ${period} — ${rows.length} payslips generated.`);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Payroll</h2>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>Enter hours and attendance, then run payroll for a pay period.</p>
        </div>
        {isAdmin && <button className="btn btn-outline" onClick={() => setShowSettings(!showSettings)}>Payroll settings</button>}
      </div>

      {showSettings && (
        <div className="card" style={{ padding: 16, marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ width: 140 }}><label className="field-label">Currency symbol</label><input type="text" value={localSettings.currency} onChange={e => setLocalSettings({ ...localSettings, currency: e.target.value })} /></div>
          <div style={{ width: 140 }}><label className="field-label">Tax rate %</label><input type="number" value={localSettings.tax_rate} onChange={e => setLocalSettings({ ...localSettings, tax_rate: e.target.value })} /></div>
          <div style={{ width: 140 }}><label className="field-label">Pension rate %</label><input type="number" value={localSettings.pension_rate} onChange={e => setLocalSettings({ ...localSettings, pension_rate: e.target.value })} /></div>
          <div style={{ width: 160 }}><label className="field-label">Overtime multiplier</label><input type="number" step="0.1" value={localSettings.overtime_multiplier} onChange={e => setLocalSettings({ ...localSettings, overtime_multiplier: e.target.value })} /></div>
          <div style={{ width: 160 }}><label className="field-label">Standard hours / month</label><input type="number" value={localSettings.standard_monthly_hours} onChange={e => setLocalSettings({ ...localSettings, standard_monthly_hours: e.target.value })} /></div>
          <div style={{ width: 200 }}><label className="field-label">Company name</label><input type="text" value={localSettings.company} onChange={e => setLocalSettings({ ...localSettings, company: e.target.value })} /></div>
          <button className="btn btn-primary" onClick={saveSettings}>Save</button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div>
          <label className="field-label">Pay period</label>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 160 }} />
        </div>
        {alreadyRun && <span className="badge badge-gold" style={{ marginTop: 22 }}>Already generated for {period}</span>}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Hours & attendance — {period}</h3>
          <button className="btn btn-outline" onClick={saveHours} disabled={savingHours}>{savingHours ? "Saving…" : "Save hours"}</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 12px" }}>
          Regular hours only apply to hourly employees. Overtime applies to anyone. Absence/late hours are deducted from pay — use these for missed time with no supporting note.
        </p>
        <table>
          <thead><tr><th>Employee</th><th>Regular hrs</th><th>Overtime hrs</th><th>Absence hrs (no note)</th><th>Late hrs</th></tr></thead>
          <tbody>
            {active.map(emp => {
              const e = entries[emp.id] || {};
              return (
                <tr key={emp.id}>
                  <td style={{ fontWeight: 600 }}>{emp.name}<span style={{ color: "var(--ink-soft)", fontWeight: 400 }}> · {emp.pay_type === "hourly" ? "hourly" : "salaried"}</span></td>
                  <td>
                    <input type="number" disabled={emp.pay_type !== "hourly"} value={e.regular_hours ?? ""} placeholder={emp.pay_type === "hourly" ? "0" : "—"}
                      onChange={ev => updateEntry(emp.id, "regular_hours", ev.target.value)} style={{ width: 90 }} />
                  </td>
                  <td><input type="number" value={e.overtime_hours ?? ""} placeholder="0" onChange={ev => updateEntry(emp.id, "overtime_hours", ev.target.value)} style={{ width: 90 }} /></td>
                  <td><input type="number" value={e.absence_hours ?? ""} placeholder="0" onChange={ev => updateEntry(emp.id, "absence_hours", ev.target.value)} style={{ width: 90 }} /></td>
                  <td><input type="number" value={e.late_hours ?? ""} placeholder="0" onChange={ev => updateEntry(emp.id, "late_hours", ev.target.value)} style={{ width: 90 }} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={runPayroll}>
        {alreadyRun ? "Re-run payroll for this period" : "Run payroll"}
      </button>

      <div className="card" style={{ overflow: "hidden" }}>
        <table>
          <thead><tr><th>Employee</th><th>Gross (before deductions)</th><th>Attendance deduction</th><th>Salary after deduction</th><th>Tax</th><th>Pension</th><th>Net pay</th></tr></thead>
          <tbody>
            {active.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: "var(--ink-soft)" }}>No active employees to run payroll for.</td></tr>}
            {active.map(emp => {
              const c = computeFor(emp);
              return (
                <tr key={emp.id}>
                  <td style={{ fontWeight: 600 }}>{emp.name}</td>
                  <td className="mono">{currency(c.grossBeforeDeductions, settings.currency)}</td>
                  <td className="mono" style={{ color: c.attendanceDeduction > 0 ? "var(--brick)" : "var(--ink-soft)" }}>
                    {c.attendanceDeduction > 0 ? `-${currency(c.attendanceDeduction, settings.currency)}` : "—"}
                  </td>
                  <td className="mono">{currency(c.adjustedGross, settings.currency)}</td>
                  <td className="mono" style={{ color: "var(--brick)" }}>-{currency(c.tax, settings.currency)}</td>
                  <td className="mono" style={{ color: "var(--brick)" }}>-{currency(c.pension, settings.currency)}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{currency(c.net, settings.currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayslipsView({ payslips, employees, settings }) {
  const [filterEmp, setFilterEmp] = useState("all");
  const [selected, setSelected] = useState(null);
  const filtered = filterEmp === "all" ? payslips : payslips.filter(p => p.employee_id === filterEmp);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Payslips</h2>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>{payslips.length} generated in total</p>
        </div>
        <select style={{ width: 200 }} value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
          <option value="all">All employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table>
          <thead><tr><th>Period</th><th>Employee</th><th>Net pay</th><th>Generated</th><th></th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 20, color: "var(--ink-soft)" }}>No payslips yet — run payroll to generate some.</td></tr>}
            {filtered.map(p => (
              <tr key={p.id}>
                <td>{p.period}</td>
                <td style={{ fontWeight: 600 }}>{p.employee_name}</td>
                <td className="mono">{currency(p.net_pay, settings.currency)}</td>
                <td style={{ color: "var(--ink-soft)", fontSize: 12 }}>{new Date(p.generated_at).toLocaleDateString()}</td>
                <td><button className="btn btn-outline" style={{ padding: "4px 10px" }} onClick={() => setSelected(p)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <PayslipModal slip={selected} settings={settings} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Row({ label, value, bold, muted }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, color: muted ? "var(--brick)" : "var(--ink)", fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span><span className="mono">{value}</span>
    </div>
  );
}

function PayslipModal({ slip, settings, onClose }) {
  return (
    <div className="modal-overlay">
      <div style={{ width: 420 }} className="print-area">
        <div className="stub" style={{ padding: 24, position: "relative" }}>
          <div style={{ position: "absolute", top: 16, right: 16, transform: "rotate(-8deg)" }} className="badge badge-gold">Paid</div>
          <div style={{ marginBottom: 18 }}>
            <div className="disp" style={{ fontSize: 16, fontWeight: 700 }}>{settings.company}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Payslip · {slip.period}</div>
          </div>
          <div style={{ borderTop: "1px dashed var(--line)", borderBottom: "1px dashed var(--line)", padding: "12px 0", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{slip.employee_name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{slip.position || "—"} · {slip.department || "—"}</div>
          </div>
          <Row label={slip.pay_type === "hourly" ? `Regular pay (${slip.regular_hours || 0} hrs)` : "Basic salary"} value={currency(slip.basic_salary, settings.currency)} />
          {Number(slip.overtime_hours) > 0 && <Row label={`Overtime (${slip.overtime_hours} hrs)`} value={currency(slip.overtime_pay, settings.currency)} />}
          <Row label="Allowances" value={currency(slip.allowances, settings.currency)} />
          <Row label="Gross pay (before deductions)" value={currency(slip.gross_pay, settings.currency)} bold />
          {Number(slip.attendance_deduction) > 0 && (
            <Row label={`Attendance deduction (${slip.attendance_deduction_hours} hrs late/absent)`} value={"-" + currency(slip.attendance_deduction, settings.currency)} muted />
          )}
          <Row label="Salary after deduction" value={currency(slip.adjusted_gross ?? slip.gross_pay, settings.currency)} bold />
          <Row label="Tax" value={"-" + currency(slip.tax_deduction, settings.currency)} muted />
          <Row label="Pension" value={"-" + currency(slip.pension_deduction, settings.currency)} muted />
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Net pay</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 16, color: "var(--accent-dark)" }}>{currency(slip.net_pay, settings.currency)}</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => window.print()}><Printer size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Print / save PDF</button>
        </div>
      </div>
    </div>
  );
}

function TeamView({ session, showToast }) {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const blankPerms = {};
  PERMISSION_DEFS.forEach(p => { blankPerms[p.key] = false; });

  const load = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*").order("username");
    setUsers(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const callAdminApi = async (body) => {
    const res = await fetch("/api/admin-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const save = async () => {
    if (!modal.username?.trim()) { showToast("Username is required.", "error"); return; }
    setBusy(true);
    try {
      if (modal.id) {
        const { error } = await supabase.from("profiles").update({ username: modal.username, permissions: modal.permissions }).eq("id", modal.id);
        if (error) throw error;
        if (modal.newPassword) {
          await callAdminApi({ action: "resetPassword", userId: modal.id, newPassword: modal.newPassword });
        }
      } else {
        if (!modal.email?.trim() || !modal.newPassword) { showToast("Email and password are required for a new login.", "error"); setBusy(false); return; }
        await callAdminApi({ action: "createHrUser", email: modal.email.trim(), password: modal.newPassword, username: modal.username.trim(), permissions: modal.permissions });
      }
      await load();
      setModal(null);
      showToast("Saved.");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u) => {
    await supabase.from("profiles").update({ active: !u.active }).eq("id", u.id);
    await load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Team and access</h2>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>Create HR logins and control exactly what each one can do.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ username: "", email: "", newPassword: "", permissions: { ...blankPerms } })}>
          <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Add HR user
        </button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table>
          <thead><tr><th>Username</th><th>Role</th><th>Permissions</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.username}</td>
                <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                <td>
                  {u.role === "admin" ? <span className="badge badge-gold">Full access</span> :
                    PERMISSION_DEFS.filter(p => u.permissions?.[p.key]).map(p => (
                      <span key={p.key} className="badge badge-green" style={{ marginRight: 4, marginBottom: 4, display: "inline-block" }}>{p.label}</span>
                    ))
                  }
                  {u.role !== "admin" && !PERMISSION_DEFS.some(p => u.permissions?.[p.key]) && <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>No permissions set</span>}
                </td>
                <td><span className={cx("badge", u.active !== false ? "badge-green" : "badge-gray")}>{u.active !== false ? "Active" : "Disabled"}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {u.role !== "admin" && (
                    <>
                      <Pencil size={14} style={{ cursor: "pointer", marginRight: 10 }} onClick={() => setModal({ ...u, newPassword: "" })} />
                      <button className="btn btn-outline" style={{ padding: "3px 9px" }} onClick={() => toggleActive(u)}>{u.active !== false ? "Disable" : "Enable"}</button>
                    </>
                  )}
                  {u.id === session.user.id && u.role === "admin" && <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>You</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 400, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{modal.id ? "Edit HR user" : "Add HR user"}</h3>
              <X size={16} style={{ cursor: "pointer" }} onClick={() => setModal(null)} />
            </div>
            {!modal.id && (
              <div style={{ marginBottom: 12 }}>
                <label className="field-label">Email (used to log in)</label>
                <input type="email" value={modal.email} onChange={e => setModal({ ...modal, email: e.target.value })} />
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label className="field-label">Display name</label>
              <input type="text" value={modal.username} onChange={e => setModal({ ...modal, username: e.target.value })} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="field-label">{modal.id ? "Reset password (optional)" : "Password"}</label>
              <input type="password" value={modal.newPassword} onChange={e => setModal({ ...modal, newPassword: e.target.value })} placeholder={modal.id ? "Leave blank to keep current" : ""} />
            </div>
            <label className="field-label" style={{ marginBottom: 8 }}>Permissions</label>
            {PERMISSION_DEFS.map(p => (
              <label key={p.key} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                <input type="checkbox" style={{ width: "auto", marginTop: 3 }} checked={!!modal.permissions?.[p.key]} onChange={e => setModal({ ...modal, permissions: { ...modal.permissions, [p.key]: e.target.checked } })} />
                <span>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.desc}</div>
                </span>
              </label>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ROADMAP = [
  { title: "Leave and attendance tracking", desc: "Let staff request time off and clock in/out, with balances that feed straight into payroll." },
  { title: "Employee self-service portal", desc: "A read-only login so staff can view their own payslips and update their own details." },
  { title: "Onboarding checklists", desc: "A repeatable checklist that fires automatically when a new employee is added." },
  { title: "Performance reviews", desc: "Simple review cycles with ratings and notes tied to each employee." },
  { title: "Org chart", desc: "Visualize reporting lines once employees have a manager field." },
  { title: "Audit log", desc: "A timestamped history of who changed what across the system." },
  { title: "Payslip email delivery", desc: "Automatically email each payslip to the employee once payroll runs." },
];

function RoadmapView() {
  return (
    <div>
      <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Roadmap</h2>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 18px" }}>Sensible next additions once this is ready to grow.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {ROADMAP.map(item => (
          <div key={item.title} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <ChevronRight size={14} color="var(--accent)" />
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{item.title}</span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
