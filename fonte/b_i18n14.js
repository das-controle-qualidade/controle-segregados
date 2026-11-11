<script>
/* ===== Textos: dólar do mês substitui os preços semanais do mês ===== */
const I18N_ADD5={
'pt-BR':{dollarMidMonth:'{n} preço(s) de planilhas semanais deste mês serão substituídos pelo dólar do mês (ficam guardados no histórico):',supersededBadge:'substituído',tSuperseded:'Preço semanal substituído pelo dólar do mês'},
'en':{dollarMidMonth:'{n} price(s) from this month’s weekly spreadsheets will be replaced by the month’s dollar rate (they stay in the history):',supersededBadge:'replaced',tSuperseded:'Weekly price replaced by the month’s dollar rate'},
'es':{dollarMidMonth:'{n} precio(s) de planillas semanales de este mes serán reemplazados por el dólar del mes (quedan guardados en el historial):',supersededBadge:'reemplazado',tSuperseded:'Precio semanal reemplazado por el dólar del mes'},
'fr':{dollarMidMonth:'{n} prix des tableaux hebdomadaires de ce mois seront remplacés par le dollar du mois (ils restent dans l’historique) :',supersededBadge:'remplacé',tSuperseded:'Prix hebdomadaire remplacé par le dollar du mois'},
'de':{dollarMidMonth:'{n} Preis(e) aus Wochentabellen dieses Monats werden durch den Monats-Dollarkurs ersetzt (sie bleiben im Verlauf):',supersededBadge:'ersetzt',tSuperseded:'Wochenpreis durch Monats-Dollarkurs ersetzt'},
'it':{dollarMidMonth:'{n} prezzo/i dei fogli settimanali di questo mese saranno sostituiti dal dollaro del mese (restano nello storico):',supersededBadge:'sostituito',tSuperseded:'Prezzo settimanale sostituito dal dollaro del mese'},
'nl':{dollarMidMonth:'{n} prijs/prijzen uit weekbestanden van deze maand worden vervangen door de dollarkoers van de maand (ze blijven in de geschiedenis):',supersededBadge:'vervangen',tSuperseded:'Weekprijs vervangen door de dollarkoers van de maand'},
'pl':{dollarMidMonth:'{n} cen(y) z tygodniowych arkuszy tego miesiąca zostanie zastąpionych kursem dolara z miesiąca (pozostają w historii):',supersededBadge:'zastąpiona',tSuperseded:'Cena tygodniowa zastąpiona kursem dolara z miesiąca'},
'ru':{dollarMidMonth:'{n} цен из недельных таблиц этого месяца будут заменены курсом доллара месяца (они остаются в истории):',supersededBadge:'заменено',tSuperseded:'Недельная цена заменена курсом доллара месяца'},
'uk':{dollarMidMonth:'{n} цін із тижневих таблиць цього місяця буде замінено курсом долара місяця (вони лишаються в історії):',supersededBadge:'замінено',tSuperseded:'Тижневу ціну замінено курсом долара місяця'},
'tr':{dollarMidMonth:'Bu ayın haftalık tablolarındaki {n} fiyat ayın dolar kuruyla değiştirilecek (geçmişte kalırlar):',supersededBadge:'değiştirildi',tSuperseded:'Haftalık fiyat ayın dolar kuruyla değiştirildi'},
'ar':{dollarMidMonth:'سيُستبدل {n} سعر من الجداول الأسبوعية لهذا الشهر بسعر دولار الشهر (تبقى في السجل):',supersededBadge:'مُستبدل',tSuperseded:'سعر أسبوعي استُبدل بدولار الشهر'},
'hi':{dollarMidMonth:'इस महीने की साप्ताहिक तालिकाओं की {n} कीमतें महीने के डॉलर से बदल दी जाएँगी (वे इतिहास में रहेंगी):',supersededBadge:'बदला गया',tSuperseded:'साप्ताहिक कीमत महीने के डॉलर से बदली गई'},
'bn':{dollarMidMonth:'এই মাসের সাপ্তাহিক শিটের {n}টি দাম মাসের ডলার দিয়ে প্রতিস্থাপিত হবে (ইতিহাসে থাকবে):',supersededBadge:'প্রতিস্থাপিত',tSuperseded:'সাপ্তাহিক দাম মাসের ডলারে প্রতিস্থাপিত'},
'zh-CN':{dollarMidMonth:'本月周表中的 {n} 个价格将被当月美元汇率取代（仍保留在历史中）：',supersededBadge:'已取代',tSuperseded:'周价格被当月美元汇率取代'},
'ja':{dollarMidMonth:'この月の週次表の価格 {n} 件は月のドル相場で置き換えられます（履歴には残ります）：',supersededBadge:'置換済み',tSuperseded:'週次価格を月のドル相場で置換'},
'ko':{dollarMidMonth:'이 달 주간 표의 가격 {n}건이 해당 월 환율로 대체됩니다(이력에는 남습니다):',supersededBadge:'대체됨',tSuperseded:'주간 가격을 월 환율로 대체'},
'id':{dollarMidMonth:'{n} harga dari tabel mingguan bulan ini akan diganti dengan dolar bulan ini (tetap tersimpan di riwayat):',supersededBadge:'diganti',tSuperseded:'Harga mingguan diganti dengan dolar bulan ini'},
'vi':{dollarMidMonth:'{n} giá từ các bảng hàng tuần của tháng này sẽ được thay bằng tỷ giá của tháng (vẫn lưu trong lịch sử):',supersededBadge:'đã thay',tSuperseded:'Giá hàng tuần được thay bằng tỷ giá của tháng'},
'th':{dollarMidMonth:'ราคาจากตารางรายสัปดาห์ของเดือนนี้ {n} รายการจะถูกแทนที่ด้วยอัตราดอลลาร์ของเดือน (ยังเก็บไว้ในประวัติ):',supersededBadge:'ถูกแทนที่',tSuperseded:'ราคารายสัปดาห์ถูกแทนที่ด้วยอัตราดอลลาร์ของเดือน'}};
for(const l in I18N_ADD5)Object.assign(I18N[l],I18N_ADD5[l]);
</script>
