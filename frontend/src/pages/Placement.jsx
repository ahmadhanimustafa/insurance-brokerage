// frontend/src/pages/Placement.jsx
// Unified Placement: Clients + Proposals + Policies
// - Proposal tab: TRX, Client, Source of Business, Sales, COB, Product, Case, Business, Booking, PS/QS (no Policy No)
// - Policy tab: all Proposal fields + Insurer, Policy No, Effective/Expiry(+1y), Currency, Premium, Commissions (net auto = gross - source)

import React, { useState, useEffect } from "react";
import api from "../services/api";

// Helpers
const toInitials = (str) => {
  if (!str) return "";
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("");
};

const monthToRoman = (monthNumber) => {
  const roman = [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
  ];
  if (monthNumber < 1 || monthNumber > 12) return "";
  return roman[monthNumber - 1];
};

const CURRENCIES = ["IDR", "USD", "EUR"];

function Placement() {
  const [activeTab, setActiveTab] = useState("clients");

  const [clients, setClients] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [policies, setPolicies] = useState([]);

  const [classOfBusiness, setClassOfBusiness] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =============================
  // Client state
  // =============================
  const initialClientForm = {
    id: "",
    type_of_client: "",
    salutation: "",
    first_name: "",
    mid_name: "",
    last_name: "",
    name: "",
    address_1: "",
    address_2: "",
    address_3: "",
    phone_1: "",
    phone_2: "",
    fax_1: "",
    fax_2: "",
    email: "",
    contact_person: "",
    contact_position: "",
    tax_id: "",
    tax_address: "",
    remarks: "",
  };

  const [clientForm, setClientForm] = useState(initialClientForm);
  const [editingClient, setEditingClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);

  const [nameValidation, setNameValidation] = useState("");
  const [emailValidation, setEmailValidation] = useState("");

  const typeOfClientOptions = [
    "Client",
    "Insurance",
    "Partner Co-Broking",
    "Source of Business",
    "Sales",
  ];

  // =============================
  // Proposal state
  // =============================
  const emptyProposalForm = {
    id: "",
    transaction_number: "",
    type_of_case: "New",
    reference_policy_id: "",
    client_id: "",
    insurance_id: "", // still exists in backend but NOT used in UI here
    source_business_id: "",
    sales_id: "",
    class_of_business_id: "",
    product_id: "",
    type_of_business: "Direct",
    effective_date: "", // used as "Booking Date" in UI
    expiry_date: "",
    premium_amount: "",
    currency: "IDR",
    commission_gross: "",
    commission_to_source: "",
    commission_net_percent: "",
    remarks: "",
    policy_number: "",
    placing_slip_number: "",
    qs_number: "",
  };

  const [proposalForm, setProposalForm] = useState(emptyProposalForm);
  const [editingProposal, setEditingProposal] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalProducts, setProposalProducts] = useState([]);

  // =============================
  // Policy state
  // =============================
  const emptyPolicyForm = {
    id: "",
    transaction_number: "",
    type_of_case: "New",
    reference_policy_id: "",
    client_id: "",
    insurance_id: "",
    source_business_id: "",
    sales_id: "",
    class_of_business_id: "",
    product_id: "",
    type_of_business: "Direct",
    booking_date: "",          // 👈 add this
    effective_date: "",
    expiry_date: "",
    premium_amount: "",
    currency: "IDR",
    commission_gross: "",
    commission_to_source: "",
    commission_net_percent: "",
    remarks: "",
    policy_number: "",
    placing_slip_number: "",
    qs_number: "",
  };


  const [policyForm, setPolicyForm] = useState(emptyPolicyForm);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyProducts, setPolicyProducts] = useState([]);

  const [policyNumberValidation, setPolicyNumberValidation] = useState("");
  const [placingValidation, setPlacingValidation] = useState("");
  const [qsValidation, setQsValidation] = useState("");

  // =============================
  // Search / filter
  // =============================
  const [clientSearch, setClientSearch] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState("");

  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalStatusFilter, setProposalStatusFilter] = useState("");

  const [policySearch, setPolicySearch] = useState("");
  const [policyStatusFilter, setPolicyStatusFilter] = useState("");

  // =============================
  // Helpers
  // =============================

  const updateClientName = (updatedForm) => {
    const fullName = `${updatedForm.first_name || ""} ${
      updatedForm.mid_name || ""
    } ${updatedForm.last_name || ""}`
      .replace(/\s+/g, " ")
      .trim();
    return {
      ...updatedForm,
      name: fullName,
    };
  };

  const generateClientId = (typeOfClient) => {
    if (!typeOfClient) return "";
    const prefix = toInitials(typeOfClient) || "CL";
    const running = String(
      clients.filter((c) => c.type_of_client === typeOfClient).length + 1
    ).padStart(3, "0");
    return `${prefix}-${running}`;
  };

  const validateClientName = (first, mid, last) => {
  // Build + normalize full name
    const full = `${first || ""} ${mid || ""} ${last || ""}`
      .replace(/\s+/g, " ")   // collapse multiple spaces to one
      .trim();

    if (!full) return "";

    const exists = clients.find((c) => {
      if (!c.name) return false;

      const stored = c.name
        .replace(/\s+/g, " ")   // normalize stored name the same way
        .trim()
        .toLowerCase();

      return (
        stored === full.toLowerCase() &&
        (!editingClient || String(c.id) !== String(editingClient.id))
      );
    });

    if (exists) {
      return `⚠️ Similar name exists: ${exists.name}${
        exists.email ? ` (${exists.email})` : ""
      }`;
    }
    return "✅ Name OK";
  };


  const isDuplicateFullName = () => {
      const full = (clientForm.name || "")
        .replace(/\s+/g, " ")
        .trim();

      if (!full) return false;

      const lower = full.toLowerCase();

      const existing = clients.find(
        (c) =>
          c.name &&
          c.name.replace(/\s+/g, " ").trim().toLowerCase() === lower &&
          (!editingClient || String(c.id) !== String(editingClient.id))
      );

      if (existing) {
        setNameValidation(`⚠️ Full name already exists: ${existing.name}`);
        return true;
      }

      // if previously there was a warning, clear it
      if (nameValidation.startsWith("⚠️")) {
        setNameValidation("");
      }

      return false;
    };



    const validateEmail = (email) => {
    if (!email) {
      setEmailValidation("Email is required");
      return false;
    }

    const pattern = /\S+@\S+\.\S+/;
    if (!pattern.test(email)) {
      setEmailValidation("Invalid email format");
      return false;
    }

    const lower = email.toLowerCase();
    const exists = clients.find(
      (c) =>
        c.email &&
        c.email.toLowerCase() === lower &&
        (!editingClient || String(c.id) !== String(editingClient.id))
    );

    if (exists) {
      setEmailValidation(
        `⚠️ Email already used by ${exists.name || exists.id}`
      );
      return false;
    }

    setEmailValidation("✅ Email looks good");
    return true;
  };


  const typeOfCaseOptions = ["New", "Renewal"];
  const typeOfBusinessOptions = ["Direct", "Non Direct"];

  // =============================
  // Load data
  // =============================
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const [clientsRes, cobRes, prodRes, proposalRes, policyRes] =
          await Promise.all([
            api.get("/placement/clients"),
            api.get("/lookups", { params: { category: "CLASS_OF_BUSINESS" } }),
            api.get("/lookups", { params: { category: "PRODUCT" } }),
            api.get("/placement/proposals"),
            api.get("/placement/policies"),
          ]);

        const clientsData = clientsRes.data.data || clientsRes.data || [];
        const cobData = (cobRes.data.data || cobRes.data || []).map((c) => ({
          ...c,
          id: String(c.id),
        }));
        const productData = (prodRes.data.data || prodRes.data || []).map(
          (p) => ({
            ...p,
            id: String(p.id),
          })
        );

        const proposalData = (proposalRes.data.data || proposalRes.data || [])
          .map((p) => ({
            ...p,
            booking_date: p.booking_date || "",
            class_of_business_id: p.class_of_business_id
              ? String(p.class_of_business_id)
              : "",
            product_id: p.product_id ? String(p.product_id) : "",
          }))
          .sort((a, b) => (a.id || 0) - (b.id || 0));

        const policyData = (policyRes.data.data?.policies ||
          policyRes.data.data ||
          policyRes.data ||
          []
        ).map((p) => ({
          ...p,
          class_of_business_id: p.class_of_business_id
            ? String(p.class_of_business_id)
            : "",
          product_id: p.product_id ? String(p.product_id) : "",
        }));

        setClients(clientsData);
        setClassOfBusiness(cobData);
        setAllProducts(productData);
        setProposals(proposalData);
        setPolicies(policyData);
      } catch (err) {
        console.error("Error loading placement data:", err);
        setError("Failed to load placement data.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  // Product filtering for Proposal
  // Product loading for Proposal based on COB (via backend)
  useEffect(() => {
    const fetchProposalProducts = async () => {
      if (!proposalForm.class_of_business_id) {
        setProposalProducts([]);
        return;
      }

      try {
        const resp = await api.get("/lookups", {
          params: {
            category: "PRODUCT",
            class_of_business_id: proposalForm.class_of_business_id,
          },
        });

        const prods = (resp.data.data || resp.data || []).map((p) => ({
          ...p,
          id: String(p.id),
        }));

        setProposalProducts(prods);
      } catch (err) {
        console.error("Error loading products for proposal COB:", err);
        setProposalProducts([]);
      }
    };

    fetchProposalProducts();
  }, [proposalForm.class_of_business_id]);

  // Product filtering for Policy
  // Product loading for Policy based on COB (via backend)
  useEffect(() => {
    const fetchPolicyProducts = async () => {
      if (!policyForm.class_of_business_id) {
        setPolicyProducts([]);
        return;
      }

      try {
        const resp = await api.get("/lookups", {
          params: {
            category: "PRODUCT",
            class_of_business_id: policyForm.class_of_business_id,
          },
        });

        const prods = (resp.data.data || resp.data || []).map((p) => ({
          ...p,
          id: String(p.id),
        }));

        setPolicyProducts(prods);
      } catch (err) {
        console.error("Error loading products for policy COB:", err);
        setPolicyProducts([]);
      }
    };

    fetchPolicyProducts();
  }, [policyForm.class_of_business_id]);

  // Auto calc net commission for Policy
  useEffect(() => {
    const gross = parseFloat(policyForm.commission_gross) || 0;
    const source = parseFloat(policyForm.commission_to_source) || 0;
    const net = gross - source;
    setPolicyForm((prev) => ({
      ...prev,
      commission_net_percent:
        gross === 0 && source === 0 ? "" : net.toFixed(2),
    }));
  }, [policyForm.commission_gross, policyForm.commission_to_source]);

  // When Policy effective date changes, set expiry = +1 year
  const handlePolicyEffectiveChange = (value) => {
    if (!value) {
      setPolicyForm((prev) => ({ ...prev, effective_date: "", expiry_date: "" }));
      return;
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      setPolicyForm((prev) => ({ ...prev, effective_date: value }));
      return;
    }
    const exp = new Date(d);
    exp.setFullYear(exp.getFullYear() + 1);
    const expStr = exp.toISOString().split("T")[0];

    setPolicyForm((prev) => ({
      ...prev,
      effective_date: value,
      expiry_date: expStr,
    }));
  };

  // =============================
  // ID helpers
  // =============================
  const getClientName = (id) =>
    clients.find((c) => String(c.id) === String(id))?.name || "";

  const getCobLabel = (id) =>
    classOfBusiness.find((c) => String(c.id) === String(id))?.label || "";

  const getProductLabel = (id) =>
    allProducts.find((p) => String(p.id) === String(id))?.label || "";

  const getClientsByTypes = (...types) =>
    clients.filter((c) => types.includes(c.type_of_client));

  // =============================
  // Policy / PS / QS generators
  // =============================
  const validateUniquePolicyNumber = (value, ignoreId) => {
    const clash = policies.find(
      (p) =>
        p.policy_number === value &&
        (!ignoreId || String(p.id) !== String(ignoreId))
    );
    setPolicyNumberValidation(clash ? "⚠️ Policy number already used." : "");
  };

  const validatePlacingNumber = (value, ignoreId) => {
    const clash = policies.find(
      (p) =>
        p.placing_slip_number === value &&
        (!ignoreId || String(p.id) !== String(ignoreId))
    );
    setPlacingValidation(clash ? "⚠️ Placing Slip already used." : "");
  };

  const validateQsNumber = (value, ignoreId) => {
    const clash = policies.find(
      (p) =>
        p.qs_number === value &&
        (!ignoreId || String(p.id) !== String(ignoreId))
    );
    setQsValidation(clash ? "⚠️ Quotation Slip already used." : "");
  };

  const getDateFromForm = (form) =>
    form.effective_date || new Date().toISOString().split("T")[0];

  const generatePsOrQsForProposal = (kind) => {
    const cob = classOfBusiness.find(
      (c) => String(c.id) === String(proposalForm.class_of_business_id)
    );
    const prod = proposalProducts.find(
      (p) => String(p.id) === String(proposalForm.product_id)
    );
    const eff = getDateFromForm(proposalForm);

    if (!cob || !prod) {
      setError("Select Class of Business & Product first.");
      return;
    }

    const d = new Date(eff);
    const year = d.getFullYear();
    const monthRoman = monthToRoman(d.getMonth() + 1);
    const prodInit = toInitials(prod.label || prod.name || prod.code || "");
    const caseCode = proposalForm.type_of_case === "Renewal" ? "RN" : "NB";

    const list =
      kind === "PS"
        ? proposals.map((p) => p.placing_slip_number).filter(Boolean)
        : proposals.map((p) => p.qs_number).filter(Boolean);

    let maxSeq = 0;
    list.forEach((num) => {
      const parts = (num || "").split("/");
      if (parts[0] !== kind) return;
      const n = parseInt(parts[2], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    });

    const next = maxSeq + 1;
    const seqStr = String(next).padStart(3, "0");

    const value =
      `${kind}/ICIB/` +
      `${seqStr}/` +
      `${monthRoman}/` +
      `${caseCode}/` +
      `${prodInit}-${year}`;

    if (kind === "PS") {
      setProposalForm((prev) => ({ ...prev, placing_slip_number: value }));
    } else {
      setProposalForm((prev) => ({ ...prev, qs_number: value }));
    }
    setError("");
  };

  const generatePolicyNumberForPolicy = () => {
    const cob = classOfBusiness.find(
      (c) => String(c.id) === String(policyForm.class_of_business_id)
    );
    const prod = policyProducts.find(
      (p) => String(p.id) === String(policyForm.product_id)
    );
    const eff = getDateFromForm(policyForm);

    if (!cob || !prod) {
      setPolicyNumberValidation("Select COB & Product first.");
      return;
    }

    const d = new Date(eff);
    const year = d.getFullYear();
    const monthRoman = monthToRoman(d.getMonth() + 1);
    const cobInit = toInitials(cob.label || cob.name || cob.code || "");
    const prodInit = toInitials(prod.label || prod.name || prod.code || "");
    const suffix = `/${cobInit}/${prodInit}/${monthRoman}/${year}`;

    const existing = policies
      .map((p) => p.policy_number)
      .filter((num) => num && num.startsWith("POL/") && num.endsWith(suffix));

    let maxSeq = 0;
    existing.forEach((num) => {
      const parts = num.split("/");
      if (parts[0] !== "POL") return;
      const n = parseInt(parts[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    });

    const next = maxSeq + 1;
    const running = String(next).padStart(3, "0");
    const newNumber = `POL/${running}${suffix}`;

    setPolicyForm((prev) => ({ ...prev, policy_number: newNumber }));
    validateUniquePolicyNumber(
      newNumber,
      policyForm.id || editingPolicy?.id || null
    );
  };

  const generatePsOrQsForPolicy = (kind) => {
    const cob = classOfBusiness.find(
      (c) => String(c.id) === String(policyForm.class_of_business_id)
    );
    const prod = policyProducts.find(
      (p) => String(p.id) === String(policyForm.product_id)
    );
    const eff = getDateFromForm(policyForm);

    if (!cob || !prod) {
      if (kind === "PS") {
        setPlacingValidation("Select COB & Product first.");
      } else {
        setQsValidation("Select COB & Product first.");
      }
      return;
    }

    const d = new Date(eff);
    const year = d.getFullYear();
    const monthRoman = monthToRoman(d.getMonth() + 1);
    const prodInit = toInitials(prod.label || prod.name || prod.code || "");
    const caseCode = policyForm.type_of_case === "Renewal" ? "RN" : "NB";

    const list =
      kind === "PS"
        ? policies.map((p) => p.placing_slip_number).filter(Boolean)
        : policies.map((p) => p.qs_number).filter(Boolean);

    let maxSeq = 0;
    list.forEach((num) => {
      const parts = (num || "").split("/");
      if (parts[0] !== kind) return;
      const n = parseInt(parts[2], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    });

    const next = maxSeq + 1;
    const seqStr = String(next).padStart(3, "0");

    const value =
      `${kind}/ICIB/` +
      `${seqStr}/` +
      `${monthRoman}/` +
      `${caseCode}/` +
      `${prodInit}-${year}`;

    if (kind === "PS") {
      setPolicyForm((prev) => ({ ...prev, placing_slip_number: value }));
      validatePlacingNumber(
        value,
        policyForm.id || editingPolicy?.id || null
      );
    } else {
      setPolicyForm((prev) => ({ ...prev, qs_number: value }));
      validateQsNumber(value, policyForm.id || editingPolicy?.id || null);
    }
  };

  // =============================
  // CRUD handlers
  // =============================

  const resetClientForm = () => {
    setClientForm(initialClientForm);
    setEditingClient(null);
    setNameValidation("");
    setEmailValidation("");
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 1) Validate email
    const emailOk = validateEmail(clientForm.email);
    if (!emailOk) {
      setError("❌ Please fix the email (invalid or already used) before saving.");
      return;
    }

    // 2) Validate full name (duplicate check)
    if (isDuplicateFullName()) {
      setError("❌ Full name already exists, please use a different name.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...clientForm,
        id: clientForm.client_id || generateClientId(clientForm.type_of_client),
      };

      if (editingClient) {
        await api.put(`/placement/clients/${editingClient.client_id}`, payload);
        setSuccess("Client updated.");
      } else {
        await api.post("/placement/clients", payload);
        setSuccess("Client created.");
      }

      const res = await api.get("/placement/clients");
      const data = res.data.data || res.data || [];
      setClients(data);

      setShowClientModal(false);
      resetClientForm();
    } catch (err) {
      console.error("Error saving client:", err);
      setError("Failed to save client.");
    } finally {
      setLoading(false);
    }
  };


  const resetProposalForm = () => {
    setProposalForm({
      ...emptyProposalForm,
      transaction_number:
        emptyProposalForm.transaction_number ||
        `TRX-${Date.now().toString().slice(-6)}`,
    });
    setEditingProposal(null);
  };

  const handleSaveProposal = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const payload = { ...proposalForm };

      if (editingProposal) {
        await api.put(
          `/placement/proposals/${editingProposal.id}`,
          payload
        );
        setSuccess("Proposal updated.");
      } else {
        await api.post("/placement/proposals", payload);
        setSuccess("Proposal created.");
      }

      const res = await api.get("/placement/proposals");
      const data = (res.data.data || res.data || []).map((p) => ({
        ...p,
        class_of_business_id: p.class_of_business_id
          ? String(p.class_of_business_id)
          : "",
        product_id: p.product_id ? String(p.product_id) : "",
      }));
      setProposals(data);

      setShowProposalModal(false);
      resetProposalForm();
    } catch (err) {
      console.error("Error saving proposal:", err);
      setError("Failed to save proposal.");
    } finally {
      setLoading(false);
    }
  };



  const handleConvertProposalToPolicy = async (proposal) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        transaction_number: proposal.transaction_number,
        type_of_case: proposal.type_of_case,
        reference_policy_id: proposal.reference_policy_id,
        client_id: proposal.client_id,
        insurance_id: proposal.insurance_id,
        source_business_id: proposal.source_business_id,
        sales_id: proposal.sales_id,
        class_of_business_id: proposal.class_of_business_id,
        product_id: proposal.product_id,
        type_of_business: proposal.type_of_business,
        placing_slip_number: proposal.placing_slip_number,
        qs_number: proposal.qs_number,
        policy_number: "", // fill in policy tab
        booking_date: proposal.effective_date || proposal.booking_date || null, // 👈 Booking from Proposal
        effective_date: "",      // 👈 fresh, to be set in Policies tab
        expiry_date: "",
        premium_amount: proposal.premium_amount,
        currency: proposal.currency,
        commission_gross: proposal.commission_gross,
        commission_to_source: proposal.commission_to_source,
        commission_net_percent: proposal.commission_net_percent,
        remarks: proposal.remarks,
      };


      await api.post("/placement/policies", payload);
      await api.post(`/placement/proposals/${proposal.id}/convert`);

      const [polRes, propRes] = await Promise.all([
        api.get("/placement/policies"),
        api.get("/placement/proposals"),
      ]);

      const polData = (polRes.data.data?.policies ||
        polRes.data.data ||
        polRes.data ||
        []
      ).map((p) => ({
        ...p,
        class_of_business_id: p.class_of_business_id
          ? String(p.class_of_business_id)
          : "",
        product_id: p.product_id ? String(p.product_id) : "",
      }));

      const propData = (propRes.data.data || propRes.data || []).map((p) => ({
        ...p,
        class_of_business_id: p.class_of_business_id
          ? String(p.class_of_business_id)
          : "",
        product_id: p.product_id ? String(p.product_id) : "",
      }));

      setPolicies(polData);
      setProposals(propData);

      setSuccess("Proposal converted to Policy. Complete details in Policies tab.");
    } catch (err) {
      console.error("Error converting proposal:", err);
      setError("Failed to convert proposal.");
    } finally {
      setLoading(false);
    }
  };

  const resetPolicyForm = () => {
    setPolicyForm(emptyPolicyForm);
    setEditingPolicy(null);
    setPolicyNumberValidation("");
    setPlacingValidation("");
    setQsValidation("");
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const payload = { ...policyForm };
      if (editingPolicy) {
        await api.put(`/placement/policies/${editingPolicy.id}`, payload);
        setSuccess("Policy updated.");
      } else {
        await api.post("/placement/policies", payload);
        setSuccess("Policy created.");
      }

      const res = await api.get("/placement/policies");
      const data = (res.data.data?.policies ||
        res.data.data ||
        res.data ||
        []
      ).map((p) => ({
        ...p,
        class_of_business_id: p.class_of_business_id
          ? String(p.class_of_business_id)
          : "",
        product_id: p.product_id ? String(p.product_id) : "",
      }));
      setPolicies(data);

      setShowPolicyModal(false);
      resetPolicyForm();
    } catch (err) {
      console.error("Error saving policy:", err);
      setError("Failed to save policy.");
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // Filtered lists
  // =============================
  const filteredClients = clients.filter((c) => {
    const term = clientSearch.trim().toLowerCase();
    const matchesType =
      !clientTypeFilter || c.type_of_client === clientTypeFilter;
    const matchesSearch =
      !term ||
      [c.id, c.name, c.email, c.phone_1, c.tax_id].some(
        (field) =>
          field && field.toString().toLowerCase().includes(term)
      );
    return matchesType && matchesSearch;
  });

  const filteredProposals = proposals.filter((p) => {
    const term = proposalSearch.trim().toLowerCase();
    const clientName = getClientName(p.client_id);
    const sourceName = getClientName(p.source_business_id);
    const salesName = getClientName(p.sales_id);
    const matchesStatus =
      !proposalStatusFilter || p.status === proposalStatusFilter;

    const matchesSearch =
      !term ||
      [
        p.transaction_number,
        p.placing_slip_number,
        p.qs_number,
        clientName,
        sourceName,
        salesName,
      ].some(
        (field) =>
          field && field.toString().toLowerCase().includes(term)
      );

    return matchesStatus && matchesSearch;
  });

  const filteredPolicies = policies.filter((p) => {
    const term = policySearch.trim().toLowerCase();
    const clientName = getClientName(p.client_id);
    const insurerName = getClientName(p.insurance_id);
    const matchesStatus =
      !policyStatusFilter || p.sent_to_finance
        ? policyStatusFilter === "SENT TO FINANCE"
        : policyStatusFilter === "DRAFT";

    const statusString = p.sent_to_finance ? "SENT TO FINANCE" : "DRAFT";

    const matchesSearch =
      !term ||
      [
        p.policy_number,
        p.placing_slip_number,
        p.qs_number,
        clientName,
        insurerName,
      ].some(
        (field) =>
          field && field.toString().toLowerCase().includes(term)
      );

    if (!policyStatusFilter) {
      return matchesSearch;
    }
    return matchesSearch && statusString === policyStatusFilter;
  });

  // =============================
  // Render
  // =============================

  return (
    <div className="container py-3">
      <h2 className="mb-3">Placement</h2>

      {(error || success) && (
        <div className="mb-3">
          {error && <div className="alert alert-danger mb-2">{error}</div>}
          {success && <div className="alert alert-success mb-0">{success}</div>}
        </div>
      )}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "clients" ? "active" : ""}`}
            onClick={() => setActiveTab("clients")}
          >
            Clients
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "proposals" ? "active" : ""}`}
            onClick={() => setActiveTab("proposals")}
          >
            Proposals
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "policies" ? "active" : ""}`}
            onClick={() => setActiveTab("policies")}
          >
            Policies
          </button>
        </li>
      </ul>

      {/* CLIENTS TAB */}
      {activeTab === "clients" && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Clients</h5>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetClientForm();
                setShowClientModal(true);
              }}
            >
              + New Client
            </button>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email, phone, tax ID..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={clientTypeFilter}
                onChange={(e) => setClientTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                {typeOfClientOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3 d-grid">
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setClientSearch("");
                  setClientTypeFilter("");
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {loading && <div className="text-muted">Loading...</div>}

          {!loading && filteredClients.length === 0 && (
            <div className="alert alert-info">No clients found.</div>
          )}

          {!loading && filteredClients.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Client ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Email</th>
                    <th>Phone 1</th>
                    <th>Tax ID</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((c) => (
                    <tr key={c.id}>
                      <td>{c.client_id}</td>
                      <td>{c.name}</td>
                      <td>{c.type_of_client}</td>
                      <td>{c.email}</td>
                      <td>{c.phone_1}</td>
                      <td>{c.tax_id}</td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => {
                            setEditingClient(c);
                            setClientForm({
                              ...initialClientForm,
                              ...c,
                            });
                            setShowClientModal(true);
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PROPOSALS TAB */}
      {activeTab === "proposals" && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Proposals</h5>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetProposalForm();
                setShowProposalModal(true);
              }}
            >
              + New Proposal
            </button>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search by TRX, client, source, sales, PS/QS..."
                value={proposalSearch}
                onChange={(e) => setProposalSearch(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={proposalStatusFilter}
                onChange={(e) => setProposalStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="CONVERTED">Converted</option>
              </select>
            </div>
            <div className="col-md-3 d-grid">
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setProposalSearch("");
                  setProposalStatusFilter("");
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {loading && <div className="text-muted">Loading...</div>}

          {!loading && filteredProposals.length === 0 && (
            <div className="alert alert-info">No proposals found.</div>
          )}

          {!loading && filteredProposals.length > 0 && (
            <div className="table-responsive mb-3">
              <table className="table table-sm align-middle">
                <thead className="table-light">
                  <tr>
                    <th>TRX No</th>
                    <th>Client</th>
                    <th>Source of Business</th>
                    <th>Sales</th>
                    <th>COB</th>
                    <th>Product</th>
                    <th>Booking Date</th>
                    <th>PS</th>
                    <th>QS</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredProposals.map((p) => (
                    <tr key={p.id}>
                      <td>{p.transaction_number}</td>
                      <td>{getClientName(p.client_id)}</td>
                      <td>{getClientName(p.source_business_id)}</td>
                      <td>{getClientName(p.sales_id)}</td>
                      <td>{getCobLabel(p.class_of_business_id)}</td>
                      <td>{getProductLabel(p.product_id)}</td>
                      <td>{p.booking_date || "-"}</td>
                      <td>{p.placing_slip_number || "-"}</td>
                      <td>{p.qs_number || "-"}</td>
                      <td>
                        <span
                          className={`badge ${
                            p.status === "CONVERTED"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {p.status || "DRAFT"}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              setEditingProposal(p);
                              setProposalForm({
                                ...emptyProposalForm,
                                ...p,
                              });
                              setShowProposalModal(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-outline-primary"
                            disabled={p.status === "CONVERTED"}
                            onClick={() => handleConvertProposalToPolicy(p)}
                          >
                            Convert
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* POLICIES TAB */}
      {activeTab === "policies" && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Policies</h5>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetPolicyForm();
                setShowPolicyModal(true);
              }}
            >
              + New Policy
            </button>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search by policy, client, insurer, PS/QS..."
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={policyStatusFilter}
                onChange={(e) => setPolicyStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT TO FINANCE">Sent to Finance</option>
              </select>
            </div>
            <div className="col-md-3 d-grid">
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setPolicySearch("");
                  setPolicyStatusFilter("");
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {loading && <div className="text-muted">Loading...</div>}

          {!loading && filteredPolicies.length === 0 && (
            <div className="alert alert-info">No policies found.</div>
          )}

          {!loading && filteredPolicies.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Policy No</th>
                    <th>Client</th>
                    <th>Insurer</th>
                    <th>COB</th>
                    <th>Product</th>
                    <th>Premium</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredPolicies.map((p) => {
                    const status = p.sent_to_finance
                      ? "SENT TO FINANCE"
                      : "DRAFT";
                    return (
                      <tr key={p.id}>
                        <td>{p.policy_number || "-"}</td>
                        <td>{getClientName(p.client_id)}</td>
                        <td>{getClientName(p.insurance_id)}</td>
                        <td>{getCobLabel(p.class_of_business_id)}</td>
                        <td>{getProductLabel(p.product_id)}</td>
                        <td>
                          {p.premium_amount
                            ? `${p.currency || "IDR"} ${Number(
                                p.premium_amount
                              ).toLocaleString()}`
                            : "-"}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              status === "SENT TO FINANCE"
                                ? "bg-info"
                                : "bg-secondary"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => {
                                setEditingPolicy(p);
                                setPolicyForm({
                                  ...emptyPolicyForm,
                                  ...p,
                                });
                                setShowPolicyModal(true);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-outline-primary"
                              disabled={p.sent_to_finance}
                              onClick={async () => {
                                try {
                                  setLoading(true);
                                  await api.post(
                                    `/placement/policies/${p.id}/send-to-finance`
                                  );
                                  setSuccess("Policy sent to Finance.");
                                  const res = await api.get(
                                    "/placement/policies"
                                  );
                                  const data = (
                                    res.data.data?.policies ||
                                    res.data.data ||
                                    res.data ||
                                    []
                                  ).map((x) => ({
                                    ...x,
                                    class_of_business_id: x.class_of_business_id
                                      ? String(x.class_of_business_id)
                                      : "",
                                    product_id: x.product_id
                                      ? String(x.product_id)
                                      : "",
                                  }));
                                  setPolicies(data);
                                } catch (err) {
                                  console.error(
                                    "Error sending policy to finance:",
                                    err
                                  );
                                  setError("Failed to send policy to Finance.");
                                } finally {
                                  setLoading(false);
                                }
                              }}
                            >
                              Send to Finance
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CLIENT MODAL */}
      {showClientModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  {editingClient ? "✏️ Edit Client" : "➕ Add New Client"}
                </h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowClientModal(false);
                    resetClientForm();
                  }}
                ></button>
              </div>
              <div
                className="modal-body"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <form onSubmit={handleAddClient}>
                  <div className="row mb-3">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Client ID (Auto-generated) *
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={
                          clientForm.client_id ||
                          generateClientId(clientForm.type_of_client)
                        }
                        disabled
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Type of Client *</label>
                      <select
                        className="form-select"
                        value={clientForm.type_of_client}
                        onChange={(e) =>
                          setClientForm({
                            ...clientForm,
                            type_of_client: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Select Type</option>
                        {typeOfClientOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <fieldset className="border p-3 mb-3">
                    <legend className="w-auto px-2">Client Name</legend>
                    <div className="row">
                      <div className="col-md-2 mb-3">
                        <label className="form-label">Salutation</label>
                        <select
                          className="form-select"
                          value={clientForm.salutation}
                          onChange={(e) =>
                            setClientForm(
                              updateClientName({
                                ...clientForm,
                                salutation: e.target.value,
                              })
                            )
                          }
                        >
                          <option value="">Select</option>
                          <option value="Mr">Mr</option>
                          <option value="Mrs">Mrs</option>
                          <option value="Ms">Ms</option>
                          <option value="Dr">Dr</option>
                          <option value="Prof">Prof</option>
                        </select>
                      </div>
                      <div className="col-md-3 mb-3">
                        <label className="form-label">First Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.first_name}
                          onChange={(e) => {
                            const updated = updateClientName({
                              ...clientForm,
                              first_name: e.target.value,
                            });
                            setClientForm(updated);
                            setNameValidation(
                              validateClientName(
                                updated.first_name,
                                updated.mid_name,
                                updated.last_name
                              )
                            );
                          }}
                          required
                        />
                      </div>
                      <div className="col-md-3 mb-3">
                        <label className="form-label">Mid Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.mid_name}
                          onChange={(e) => {
                            const updated = updateClientName({
                              ...clientForm,
                              mid_name: e.target.value,
                            });
                            setClientForm(updated);
                            setNameValidation(
                              validateClientName(
                                updated.first_name,
                                updated.mid_name,
                                updated.last_name
                              )
                            );
                          }}
                        />
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Last Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.last_name}
                          onChange={(e) => {
                            const updated = updateClientName({
                              ...clientForm,
                              last_name: e.target.value,
                            });
                            setClientForm(updated);
                            setNameValidation(
                              validateClientName(
                                updated.first_name,
                                updated.mid_name,
                                updated.last_name
                              )
                            );
                          }}
                          required
                        />
                      </div>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted">
                        Full Name: <strong>{clientForm.name || "-"}</strong>
                      </small>
                    </div>
                    {nameValidation && (
                      <div className="mb-2">
                        <small className="text-muted">{nameValidation}</small>
                      </div>
                    )}
                  </fieldset>

                  <fieldset className="border p-3 mb-3">
                    <legend className="w-auto px-2">Address</legend>
                    <div className="mb-3">
                      <label className="form-label">Address Line 1</label>
                      <input
                        type="text"
                        className="form-control"
                        value={clientForm.address_1}
                        onChange={(e) =>
                          setClientForm({
                            ...clientForm,
                            address_1: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Address Line 2</label>
                      <input
                        type="text"
                        className="form-control"
                        value={clientForm.address_2}
                        onChange={(e) =>
                          setClientForm({
                            ...clientForm,
                            address_2: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Address Line 3</label>
                      <input
                        type="text"
                        className="form-control"
                        value={clientForm.address_3}
                        onChange={(e) =>
                          setClientForm({
                            ...clientForm,
                            address_3: e.target.value,
                          })
                        }
                      />
                    </div>
                  </fieldset>

                  <fieldset className="border p-3 mb-3">
                    <legend className="w-auto px-2">Contact Information</legend>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Phone 1</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={clientForm.phone_1}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              phone_1: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Phone 2</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={clientForm.phone_2}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              phone_2: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Fax 1</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={clientForm.fax_1}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              fax_1: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Fax 2</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={clientForm.fax_2}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              fax_2: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Email *</label>
                        <input
                          type="email"
                          className="form-control"
                          value={clientForm.email}
                          onChange={(e) => {
                            setClientForm({
                              ...clientForm,
                              email: e.target.value,
                            });
                            validateEmail(e.target.value);
                          }}
                          required
                        />
                        {emailValidation && (
                          <small className="d-block mt-1">
                            {emailValidation}
                          </small>
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Contact Person</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.contact_person}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              contact_person: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Contact Position</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.contact_position}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              contact_position: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="border p-3 mb-3">
                    <legend className="w-auto px-2">Tax Information</legend>
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Tax ID</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.tax_id}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              tax_id: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="col-md-8 mb-3">
                        <label className="form-label">Tax Address</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.tax_address}
                          onChange={(e) =>
                            setClientForm({
                              ...clientForm,
                              tax_address: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </fieldset>

                  <div className="mb-3">
                    <label className="form-label">Remarks</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={clientForm.remarks}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          remarks: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-secondary me-2"
                      onClick={() => {
                        setShowClientModal(false);
                        resetClientForm();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading
                        ? "Saving..."
                        : editingClient
                        ? "Update Client"
                        : "Save Client"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROPOSAL MODAL */}
      {showProposalModal && (
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  {editingProposal ? "Edit Proposal" : "New Proposal"}
                </h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowProposalModal(false);
                    resetProposalForm();
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSaveProposal}>
                  <div className="mb-3">
                    <label className="form-label">TRX No</label>
                    <input
                      type="text"
                      className="form-control"
                      value={proposalForm.transaction_number}
                      onChange={(e) =>
                        setProposalForm({
                          ...proposalForm,
                          transaction_number: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Client</label>
                      <select
                        className="form-select"
                        value={proposalForm.client_id}
                        onChange={(e) =>
                          setProposalForm({
                            ...proposalForm,
                            client_id: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Select Client</option>
                        {getClientsByTypes("Client").map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Source of Business</label>
                      <select
                        className="form-select"
                        value={proposalForm.source_business_id}
                        onChange={(e) =>
                          setProposalForm({
                            ...proposalForm,
                            source_business_id: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Source</option>
                        {getClientsByTypes("Partner Co-Broking", "Source of Business").map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Sales Name</label>
                      <select
                        className="form-select"
                        value={proposalForm.sales_id}
                        onChange={(e) =>
                          setProposalForm({
                            ...proposalForm,
                            sales_id: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Sales</option>
                        {getClientsByTypes("Sales").map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Class of Business</label>
                      <select
                        className="form-select"
                        value={proposalForm.class_of_business_id}
                        onChange={(e) =>
                          setProposalForm({
                            ...proposalForm,
                            class_of_business_id: e.target.value,
                            product_id: "",
                          })
                        }
                        required
                      >
                        <option value="">Select COB</option>
                        {classOfBusiness.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                    <label className="form-label">Product</label>
                    <select
                      className="form-select"
                      value={proposalForm.product_id}
                      onChange={(e) =>
                        setProposalForm({
                          ...proposalForm,
                          product_id: e.target.value,
                        })
                      }
                      required
                      disabled={!proposalForm.class_of_business_id}
                    >
                      <option value="">Select Product</option>
                      {proposalProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Booking Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={proposalForm.booking_date || ""}
                        onChange={(e) =>
                          setProposalForm({
                            ...proposalForm,
                            booking_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Type of Case</label>
                      <select
                        className="form-select"
                        value={proposalForm.type_of_case}
                        onChange={(e) =>
                          setProposalForm({
                            ...proposalForm,
                            type_of_case: e.target.value,
                          })
                        }
                      >
                        {typeOfCaseOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Business Type</label>
                      <select
                        className="form-select"
                        value={proposalForm.type_of_business}
                        onChange={(e) =>
                          setProposalForm({
                            ...proposalForm,
                            type_of_business: e.target.value,
                          })
                        }
                      >
                        {typeOfBusinessOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Placing Slip No</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={proposalForm.placing_slip_number || ""}
                          onChange={(e) =>
                            setProposalForm({
                              ...proposalForm,
                              placing_slip_number: e.target.value,
                            })
                          }
                          placeholder="PS/ICIB/001/I/NB/PROD-2025"
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => generatePsOrQsForProposal("PS")}
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Quotation Slip No</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={proposalForm.qs_number || ""}
                          onChange={(e) =>
                            setProposalForm({
                              ...proposalForm,
                              qs_number: e.target.value,
                            })
                          }
                          placeholder="QS/ICIB/001/I/NB/PROD-2025"
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => generatePsOrQsForProposal("QS")}
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Remarks</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={proposalForm.remarks || ""}
                      onChange={(e) =>
                        setProposalForm({
                          ...proposalForm,
                          remarks: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-secondary me-2"
                      onClick={() => {
                        setShowProposalModal(false);
                        resetProposalForm();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading
                        ? "Saving..."
                        : editingProposal
                        ? "Update Proposal"
                        : "Save Proposal"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POLICY MODAL */}
      {showPolicyModal && (
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  {editingPolicy ? "Edit Policy" : "New Policy"}
                </h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowPolicyModal(false);
                    resetPolicyForm();
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSavePolicy}>
                  <div className="mb-3">
                    <label className="form-label">TRX No (optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={policyForm.transaction_number || ""}
                      onChange={(e) =>
                        setPolicyForm({
                          ...policyForm,
                          transaction_number: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Client</label>
                      <select
                        className="form-select"
                        value={policyForm.client_id}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            client_id: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Select Client</option>
                        {getClientsByTypes("Client").map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Insurer</label>
                      <select
                        className="form-select"
                        value={policyForm.insurance_id}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            insurance_id: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Select Insurer</option>
                        {getClientsByTypes("Insurance").map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Source of Business</label>
                      <select
                        className="form-select"
                        value={policyForm.source_business_id}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            source_business_id: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Source</option>
                        {getClientsByTypes("Partner Co-Broking","Source of Business").map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Sales Name</label>
                      <select
                        className="form-select"
                        value={policyForm.sales_id}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            sales_id: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Sales</option>
                        {getClientsByTypes("Sales").map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Class of Business</label>
                      <select
                        className="form-select"
                        value={policyForm.class_of_business_id}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            class_of_business_id: e.target.value,
                            product_id: "",
                          })
                        }
                        required
                      >
                        <option value="">Select COB</option>
                        {classOfBusiness.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Product</label>
                      <select
                        className="form-select"
                        value={policyForm.product_id}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            product_id: e.target.value,
                          })
                        }
                        required
                        disabled={!policyForm.class_of_business_id}
                      >
                        <option value="">Select Product</option>
                        {policyProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Type of Case</label>
                      <select
                        className="form-select"
                        value={policyForm.type_of_case}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            type_of_case: e.target.value,
                          })
                        }
                      >
                        {typeOfCaseOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Business Type</label>
                      <select
                        className="form-select"
                        value={policyForm.type_of_business}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            type_of_business: e.target.value,
                          })
                        }
                      >
                        {typeOfBusinessOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Booking Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={policyForm.booking_date || ""}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            booking_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Effective Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={policyForm.effective_date || ""}
                        onChange={(e) =>
                          handlePolicyEffectiveChange(e.target.value)
                        }
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Expiry Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={policyForm.expiry_date || ""}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            expiry_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Placing Slip No</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={policyForm.placing_slip_number || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPolicyForm({
                              ...policyForm,
                              placing_slip_number: value,
                            });
                            validatePlacingNumber(
                              value,
                              policyForm.id || editingPolicy?.id || null
                            );
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => generatePsOrQsForPolicy("PS")}
                        >
                          Generate
                        </button>
                      </div>
                      {placingValidation && (
                        <small className="text-danger">
                          {placingValidation}
                        </small>
                      )}
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Quotation Slip No</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={policyForm.qs_number || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPolicyForm({
                              ...policyForm,
                              qs_number: value,
                            });
                            validateQsNumber(
                              value,
                              policyForm.id || editingPolicy?.id || null
                            );
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => generatePsOrQsForPolicy("QS")}
                        >
                          Generate
                        </button>
                      </div>
                      {qsValidation && (
                        <small className="text-danger">{qsValidation}</small>
                      )}
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Policy No</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={policyForm.policy_number || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPolicyForm({
                              ...policyForm,
                              policy_number: value,
                            });
                            validateUniquePolicyNumber(
                              value,
                              policyForm.id || editingPolicy?.id || null
                            );
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={generatePolicyNumberForPolicy}
                        >
                          Generate
                        </button>
                      </div>
                      {policyNumberValidation && (
                        <small className="text-danger">
                          {policyNumberValidation}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-2 mb-3">
                      <label className="form-label">Currency</label>
                      <select
                        className="form-select"
                        value={policyForm.currency || "IDR"}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            currency: e.target.value,
                          })
                        }
                      >
                        {CURRENCIES.map((cur) => (
                          <option key={cur} value={cur}>
                            {cur}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Premium Amount</label>
                      <input
                        type="number"
                        className="form-control"
                        value={policyForm.premium_amount || ""}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            premium_amount: e.target.value,
                          })
                        }
                      />
                    </div>
                    </div>

                  <div className="row">
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Commission Gross</label>
                      <input
                        type="number"
                        className="form-control"
                        value={policyForm.commission_gross || ""}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            commission_gross: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Commission to Source</label>
                      <input
                        type="number"
                        className="form-control"
                        value={policyForm.commission_to_source || ""}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            commission_to_source: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-md-3 mb-3">
                    <label className="form-label">Net Commission (amount)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={policyForm.commission_net_percent || ""}
                      readOnly
                    />
                  </div>
                  </div>

                  

                  <div className="mb-3">
                    <label className="form-label">Remarks</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={policyForm.remarks || ""}
                      onChange={(e) =>
                        setPolicyForm({
                          ...policyForm,
                          remarks: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-secondary me-2"
                      onClick={() => {
                        setShowPolicyModal(false);
                        resetPolicyForm();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading
                        ? "Saving..."
                        : editingPolicy
                        ? "Update Policy"
                        : "Save Policy"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Placement;
