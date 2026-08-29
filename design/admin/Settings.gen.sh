. ./_parts.sh
cat <<EOF
<div class="page" style="padding:0">
<div class="app" style="width:1440px;min-height:820px">
$(aside settings)
  <div style="display:flex;flex-direction:column;min-width:0">
$(chead "Настройки" "Три страницы конфигурации: заполняются однажды и правятся редко" '')
    <div class="main">
      <div class="alert a-warn">
        <span class="ai">$I_WARN</span>
        <div><div class="at">Два поля компании ещё не заполнены</div>
        <div class="ad">Пока они пусты, на сайте вместо этих данных стоят заглушки. Публиковать в таком виде нельзя.</div></div>
      </div>

      <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">
        <div class="card hov"><div class="bd stack" style="gap:12px;padding:20px">
          <span class="row" style="justify-content:space-between">
            <span style="width:40px;height:40px;border-radius:12px;background:var(--accent-bg);color:var(--on-accent);display:flex;align-items:center;justify-content:center">$I_COMP</span>
            <span class="chip c-warn">82%</span>
          </span>
          <span class="stack" style="gap:4px">
            <span class="ttl">Компания</span>
            <span class="t-lbl mut">Контакты, адрес и координаты, часы, регион, реквизиты, гарантия и оплата, соцсети, метаданные главной</span>
          </span>
          <span class="bar" style="margin-top:2px"><i style="width:82%"></i></span>
          <span class="row" style="gap:6px;flex-wrap:wrap"><span class="chip c-warn">Способы оплаты</span><span class="chip c-warn">Метаданные главной</span></span>
        </div></div>

        <div class="card hov"><div class="bd stack" style="gap:12px;padding:20px">
          <span class="row" style="justify-content:space-between">
            <span style="width:40px;height:40px;border-radius:12px;background:var(--accent-bg);color:var(--on-accent);display:flex;align-items:center;justify-content:center">$I_PRICE</span>
            <span class="chip c-success">заполнено</span>
          </span>
          <span class="stack" style="gap:4px">
            <span class="ttl">Цены на монтаж</span>
            <span class="t-lbl mut">Ставки по классам мощности, включённые метры трассы, порог высотных работ, доплаты</span>
          </span>
          <span class="t-tiny fnt" style="margin-top:auto">Последняя правка — 14 августа</span>
        </div></div>

        <div class="card hov"><div class="bd stack" style="gap:12px;padding:20px">
          <span class="row" style="justify-content:space-between">
            <span style="width:40px;height:40px;border-radius:12px;background:var(--accent-bg);color:var(--on-accent);display:flex;align-items:center;justify-content:center">$I_BELL</span>
            <span class="chip c-danger">1 отказ</span>
          </span>
          <span class="stack" style="gap:4px">
            <span class="ttl">Уведомления</span>
            <span class="t-lbl mut">Каналы и адресаты, готовность канала, журнал доставки с причиной отказа и повтором</span>
          </span>
          <span class="t-tiny" style="margin-top:auto;color:var(--error-ink)">Telegram: бот заблокирован получателем</span>
        </div></div>
      </div>

      <div class="card">
        <div class="hd"><span class="ttl">Почему эти три, а не шесть</span></div>
        <div class="bd">
          <table class="tbl">
            <thead><tr><th style="width:220px">Раздел</th><th>Природа</th><th style="width:220px">Где живёт</th></tr></thead>
            <tbody>
              <tr><td class="strong">Компания</td><td>конфигурация, заполняется однажды</td><td><span class="chip c-primary">Настройки</span></td></tr>
              <tr><td class="strong">Цены на монтаж</td><td>конфигурация, правится редко</td><td><span class="chip c-primary">Настройки</span></td></tr>
              <tr><td class="strong">Уведомления</td><td>конфигурация каналов</td><td><span class="chip c-primary">Настройки</span></td></tr>
              <tr><td class="strong">Каталог</td><td>содержимое: модели, цены, скидки — правится при каждой смене цены</td><td><span class="chip c-default">в колонке</span></td></tr>
              <tr><td class="strong">База знаний</td><td>содержимое: статьи</td><td><span class="chip c-default">в колонке</span></td></tr>
              <tr><td class="strong">Отзывы</td><td>очередь модерации, ежедневная работа; счётчик стоит на входном экране</td><td><span class="chip c-default">в колонке</span></td></tr>
            </tbody>
          </table>
          <p class="t-lbl mut" style="margin-top:14px">Адреса не двигаются: <span class="mono">/admin/company</span>, <span class="mono">/admin/prices</span> и <span class="mono">/admin/notifications</span> остаются на месте, добавляется только <span class="mono">/admin/settings</span>. Уже разосланные письма несут ссылку <span class="mono">/admin/reviews</span> — переписать их нельзя.</p>
        </div>
      </div>
    </div>
  </div>
</div>
</div>
EOF
