export async function mountPayPal({api, contractId, button, onUpdate, onError}) {
  if (typeof window.paypal?.createInstance !== "function") {
  throw new Error("PayPal SDK v6 did not load. Check the browser Console for a blocked or failed PayPal script.");
}
  const config = await api.config();
  if (!config.paypal_client_id) throw new Error("Set PAYPAL_CLIENT_ID in the backend .env.");
  const sdk = await window.paypal.createInstance({
    clientId: config.paypal_client_id, components:["paypal-payments"], pageType:"checkout"
  });
  const methods = await sdk.findEligibleMethods({currencyCode:"USD"});
  if (!methods.isEligible("paypal")) throw new Error("PayPal is not eligible for this browser/buyer.");
  const session = sdk.createPayPalOneTimePaymentSession({
    async onApprove(data) {
      try {
        const stored = await api.status(contractId);
        if (stored.paypal_order_id !== data.orderId) throw new Error("PayPal order does not match this contract.");
        // Approval starts server authorization, never browser capture.
        await api.authorize(contractId);
        await onUpdate();
      } catch (error) { onError(error); }
    },
    onCancel() { onError(new Error("PayPal approval cancelled. Refresh server status before retrying.")); },
    onError
  });
  const click = async () => {
    if (button.dataset.busy) return;
    button.dataset.busy = "1";
    try {
      await session.start({presentationMode:"auto"},
        api.order(contractId).then(order => ({orderId:order.paypal_order_id})));
    } catch (error) { onError(error); }
    finally { delete button.dataset.busy; }
  };
  button.addEventListener("click", click);
  button.hidden = false;
  return () => { button.hidden = true; button.removeEventListener("click", click); };
}
