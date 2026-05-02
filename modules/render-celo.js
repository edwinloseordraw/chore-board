export function renderCeloSchool(){
  const app = document.getElementById("app");

  // Monthly cache-bust without needing HTML edits each month.
  const d = new Date();
  const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  app.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <div class="left">
          <h2 style="margin:0;">Celo's School</h2>
          <div class="hint" style="margin:0;">Calendar of events</div>
        </div>
      </div>

      <div class="panel" style="margin-top:12px; padding:12px;">
        <img
          src="month.png?v=${encodeURIComponent(v)}"
          alt="Celo's School calendar"
          style="width:100%; max-width:1100px; display:block; margin:0 auto; border-radius:12px;"
        />
      </div>

      <div class="hint" style="margin-top:10px; text-align:center;">
        Replace <code>month.png</code> in GitHub each month. No HTML edits needed.
      </div>
    </section>
  `;
}
