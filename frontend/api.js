// Framework independent: import this module from plain JavaScript or React.
export class AgentGainAPI {
  constructor({baseURL = "", getToken = () => ""} = {}) {
    this.baseURL = baseURL.replace(/\/$/, "");
    this.getToken = getToken;
  }
  async request(path, {body, auth = true, signal} = {}) {
    const token = auth ? this.getToken() : "";
    if (auth && !token) throw new Error("Enter the appropriate buyer or seller demo token.");
    const response = await fetch(this.baseURL + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {...(body === undefined ? {} : {"Content-Type":"application/json"}),
        ...(token ? {Authorization: "Bearer " + token} : {})},
      ...(body === undefined ? {} : {body: JSON.stringify(body)}), signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail || data);
      const error = new Error(response.status + ": " + detail);
      error.status = response.status;
      throw error;
    }
    return data;
  }
  health() { return this.request("/health", {auth:false}); }
  config() { return this.request("/api/frontend-config", {auth:false}); }
  registerSkill(body) { return this.request("/api/skills/register", {body}); }
  checkout(id) { return this.request("/api/checkout/" + encodeURIComponent(id), {auth:false}); }
  attemptTask(body) { return this.request("/api/buyer/attempt-task", {body}); }
  prepareDataset(body) { return this.request("/api/datasets/prepare", {body}); }
  createContract(body) { return this.request("/contracts/", {body}); }
  contract(id) { return this.request("/contracts/" + encodeURIComponent(id)); }
  approveContract(c) { return this.request("/contracts/" + encodeURIComponent(c.contract_id) + "/approve",
    {body:{contract_version:c.contract_version, terms_hash:c.terms_hash}}); }
  order(id) { return this.request("/payments/" + encodeURIComponent(id) + "/order", {body:{}}); }
  authorize(id) { return this.request("/payments/" + encodeURIComponent(id) + "/authorize", {body:{}}); }
  status(id) { return this.request("/payments/" + encodeURIComponent(id) + "/status"); }
  evidence(id) { return this.request("/analytics/contracts/" + encodeURIComponent(id) + "/evidence"); }
  receipt(id) { return this.request("/payments/" + encodeURIComponent(id) + "/receipt"); }
  retryTask(body) { return this.request("/api/buyer/retry-original-task", {body}); }
  sellerFunnel(id) { return this.request("/analytics/seller/" + encodeURIComponent(id) + "/funnel"); }
  sellerOutcomes(id) { return this.request("/analytics/seller/" + encodeURIComponent(id) + "/outcomes"); }
  async watch(id, onUpdate, {signal, interval = 5000, maxMs = 7200000} = {}) {
    const start = Date.now();
    while (!signal?.aborted && Date.now() - start < maxMs) {
      const state = await this.status(id);
      await onUpdate(state);
      if (["CAPTURE_COMPLETED", "VOIDED", "PAYMENT_ERROR"].includes(state.payment_state)) return state;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return null; // Local timeout or cancellation never implies provider cancellation.
  }
}
