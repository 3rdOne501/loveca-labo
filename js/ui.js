/** 軽量トースト（アラート乱発を避ける） */
export function showToast(message, { duration = 2800, placement = "bottom-right", variant = "" } = {}) {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    stack.className = "toast-stack";
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }
  const t = document.createElement("p");
  t.className = "toast";
  if (placement === "center") t.classList.add("toast--center");
  if (variant) t.classList.add("toast--" + String(variant));
  t.textContent = message;
  stack.appendChild(t);
  requestAnimationFrame(function () {
    t.classList.add("is-in");
  });
  window.setTimeout(function () {
    t.classList.remove("is-in");
    window.setTimeout(function () {
      t.remove();
    }, 220);
  }, duration);
}
