// Test definitions for E-Basar
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.testSuites = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const suites = [
        {
            name: '1. IBAN-Validierung & Formatierung',
            tests: [
                {
                    name: 'Gültige deutsche IBAN wird als true validiert',
                    fn(t) {
                        t.assertTrue(t.app.validateIBAN('DE89370400440532013000'), 'Gültige DE-IBAN muss true liefern');
                    }
                },
                {
                    name: 'Ungültige Prüfziffer wird als false validiert',
                    fn(t) {
                        t.assertFalse(t.app.validateIBAN('DE89370400440532013001'), 'Falsche Prüfziffer muss false liefern');
                    }
                },
                {
                    name: 'Ungültiges Format / zu kurz wird abgelehnt',
                    fn(t) {
                        t.assertFalse(t.app.validateIBAN('ABC'), 'Zu kurzer String muss false liefern');
                        t.assertFalse(t.app.validateIBAN(''), 'Leerer String muss false liefern');
                        t.assertFalse(t.app.validateIBAN('123456789'), 'Nur Ziffern müssen false liefern');
                    }
                },
                {
                    name: 'formatIBAN formatiert in 4er-Blöcke',
                    fn(t) {
                        const formatted = t.app.formatIBAN('DE89370400440532013000');
                        t.assertEqual(formatted, 'DE89 3704 0044 0532 0130 00', 'IBAN muss in 4er Blöcke aufgeteilt werden');
                    }
                },
                {
                    name: 'formatAmountDE formatiert Beträge im deutschen Währungsformat',
                    fn(t) {
                        t.assertEqual(t.app.formatAmountDE(12), '12,00', 'Ganze Zahl 12 -> 12,00');
                        t.assertEqual(t.app.formatAmountDE(12.5), '12,50', 'Dezimalzahl 12.5 -> 12,50');
                        t.assertEqual(t.app.formatAmountDE(1234.56), '1.234,56', 'Tausendertrennung');
                    }
                },
                {
                    name: 'normalizeIbanForCompare normalisiert IBANs für Vergleiche',
                    fn(t) {
                        const n1 = t.app.normalizeIbanForCompare('de89 3704 0044 0532 0130 00');
                        const n2 = t.app.normalizeIbanForCompare('DE89370400440532013000');
                        t.assertEqual(n1, n2, 'Normalisierte IBANs müssen identisch sein');
                    }
                }
            ]
        },
        {
            name: '2. Datenmodell, Persistenz & Timestamps',
            tests: [
                {
                    name: 'addSellerItem legt Objekt mit paid: false und sellerPaid: false an',
                    fn(t) {
                        t.reset();
                        const item = t.app.addSellerItem({
                            sellerName: 'Max Mustermann',
                            sellerIban: 'DE89370400440532013000',
                            param: 'Fahrrad Blau',
                            price: 150.00,
                            phone: '+49 170 123456'
                        });
                        t.assertTrue(!!item.id, 'Objekt muss eine ID haben');
                        t.assertEqual(item.sellerName, 'Max Mustermann');
                        t.assertEqual(item.price, 150.00);
                        t.assertFalse(item.paid, 'paid muss initial false sein');
                        t.assertFalse(item.sellerPaid, 'sellerPaid muss initial false sein');
                        t.assertFalse(item.deleted, 'deleted muss initial false sein');
                        t.assertTrue(!!item.createdAt, 'createdAt muss gesetzt sein');
                    }
                },
                {
                    name: 'setSellerPaid setzt paid: true, paidMethod und paidAt Zeitstempel',
                    fn(t) {
                        t.reset();
                        const item = t.app.addSellerItem({
                            sellerName: 'Max',
                            sellerIban: 'DE89370400440532013000',
                            param: 'Rad 1',
                            price: 50.00
                        });
                        t.app.setSellerPaid(item.id, 'bar');
                        const items = t.app.getSellerItems();
                        const updated = items.find(i => i.id === item.id);
                        t.assertTrue(updated.paid, 'paid muss true sein');
                        t.assertEqual(updated.paidMethod, 'bar', 'paidMethod muss bar sein');
                        t.assertTrue(!!updated.paidAt, 'paidAt Zeitstempel muss gesetzt sein');
                    }
                },
                {
                    name: 'setSellerPaidSeller setzt sellerPaid: true und sellerPaidAt',
                    fn(t) {
                        t.reset();
                        const item = t.app.addSellerItem({
                            sellerName: 'Max',
                            sellerIban: 'DE89370400440532013000',
                            param: 'Rad 1',
                            price: 50.00
                        });
                        t.app.setSellerPaid(item.id, 'elektronisch');
                        t.app.setSellerPaidSeller(item.id);
                        const items = t.app.getSellerItems();
                        const updated = items.find(i => i.id === item.id);
                        t.assertTrue(updated.sellerPaid, 'sellerPaid muss true sein');
                        t.assertTrue(!!updated.sellerPaidAt, 'sellerPaidAt Zeitstempel muss gesetzt sein');
                    }
                },
                {
                    name: 'updateSellerItem pflegt paidAt beim nachträglichen Markieren als bezahlt',
                    fn(t) {
                        t.reset();
                        const item = t.app.addSellerItem({
                            sellerName: 'Max',
                            sellerIban: 'DE89370400440532013000',
                            param: 'Rad 2',
                            price: 75.00
                        });
                        t.assertFalse(item.paid);
                        t.assertFalse(!!item.paidAt);
                        t.app.updateSellerItem(item.id, {
                            sellerName: 'Max',
                            sellerIban: 'DE89370400440532013000',
                            param: 'Rad 2',
                            price: 75.00,
                            phone: '',
                            paid: true,
                            paidMethod: 'elektronisch',
                            sellerPaid: false
                        });
                        const updated = t.app.getSellerItems().find(i => i.id === item.id);
                        t.assertTrue(updated.paid);
                        t.assertTrue(!!updated.paidAt, 'paidAt muss bei Bearbeitung gesetzt werden');
                    }
                },
                {
                    name: 'getSellerItems migriert ältere Einträge ohne paidAt/paidMethod',
                    fn(t) {
                        t.reset();
                        const legacy = [{
                            id: 'legacy1',
                            sellerName: 'Alt',
                            sellerIban: 'DE89370400440532013000',
                            param: 'Altes Rad',
                            price: 20,
                            paid: true,
                            createdAt: '2026-09-01T10:00:00.000Z'
                        }];
                        localStorage.setItem('sellerItems', JSON.stringify(legacy));
                        const loaded = t.app.getSellerItems();
                        t.assertEqual(loaded.length, 1);
                        t.assertEqual(loaded[0].paidMethod, 'elektronisch', 'paidMethod Fallback muss elektronisch sein');
                        t.assertFalse(loaded[0].sellerPaid, 'sellerPaid Fallback muss false sein');
                        t.assertEqual(loaded[0].paidAt, '2026-09-01T10:00:00.000Z', 'paidAt Fallback aus createdAt');
                    }
                }
            ]
        },
        {
            name: '3. Filterlogik: Modus „Verkaufen“ (sell)',
            tests: [
                {
                    name: 'Standardmäßig (showPaid=false) werden NUR unbezahlte Objekte angezeigt',
                    fn(t) {
                        t.reset();
                        t.app.addSellerItem({ sellerName: 'A', sellerIban: 'DE89370400440532013000', param: 'Unbezahlt', price: 10 });
                        const bezahltOffen = t.app.addSellerItem({ sellerName: 'B', sellerIban: 'DE89370400440532013000', param: 'BezahltOffen', price: 20 });
                        t.app.setSellerPaid(bezahltOffen.id, 'bar');
                        const bezahltAusgezahlt = t.app.addSellerItem({ sellerName: 'C', sellerIban: 'DE89370400440532013000', param: 'BezahltAusgezahlt', price: 30 });
                        t.app.setSellerPaid(bezahltAusgezahlt.id, 'elektronisch');
                        t.app.setSellerPaidSeller(bezahltAusgezahlt.id);

                        t.setMode('sell');
                        t.setShowPaid(false);
                        const list = t.getRenderedItems();
                        t.assertEqual(list.length, 1, 'Nur 1 Objekt darf angezeigt werden');
                        t.assertEqual(list[0].param, 'Unbezahlt', 'Es darf nur das unbezahlte Objekt sichtbar sein');
                    }
                },
                {
                    name: 'Mit showPaid=true werden alle Objekte (unbezahlt und bezahlt) angezeigt',
                    fn(t) {
                        t.reset();
                        t.app.addSellerItem({ sellerName: 'A', sellerIban: 'DE89370400440532013000', param: 'Unbezahlt', price: 10 });
                        const b = t.app.addSellerItem({ sellerName: 'B', sellerIban: 'DE89370400440532013000', param: 'BezahltOffen', price: 20 });
                        t.app.setSellerPaid(b.id, 'bar');
                        const c = t.app.addSellerItem({ sellerName: 'C', sellerIban: 'DE89370400440532013000', param: 'BezahltAusgezahlt', price: 30 });
                        t.app.setSellerPaid(c.id, 'elektronisch');
                        t.app.setSellerPaidSeller(c.id);

                        t.setMode('sell');
                        t.setShowPaid(true);
                        const list = t.getRenderedItems();
                        t.assertEqual(list.length, 3, 'Alle 3 Objekte müssen bei showPaid=true sichtbar sein');
                    }
                }
            ]
        },
        {
            name: '4. Filterlogik: Modus „Verkäufer erfassen“ (seller)',
            tests: [
                {
                    name: 'Standardmäßig werden unbezahlte sowie bezahlte-aber-noch-nicht-erstattete Objekte angezeigt',
                    fn(t) {
                        t.reset();
                        t.app.addSellerItem({ sellerName: 'A', sellerIban: 'DE89370400440532013000', param: 'Unbezahlt', price: 10 });
                        const b = t.app.addSellerItem({ sellerName: 'B', sellerIban: 'DE89370400440532013000', param: 'BezahltOffen', price: 20 });
                        t.app.setSellerPaid(b.id, 'bar');
                        const c = t.app.addSellerItem({ sellerName: 'C', sellerIban: 'DE89370400440532013000', param: 'BezahltAusgezahlt', price: 30 });
                        t.app.setSellerPaid(c.id, 'elektronisch');
                        t.app.setSellerPaidSeller(c.id);

                        t.setMode('seller');
                        t.setShowPaid(false);
                        const list = t.getRenderedItems();
                        t.assertEqual(list.length, 2, 'Unbezahlt + bezahlt-offen müssen sichtbar sein');
                        const params = list.map(i => i.param);
                        t.assertTrue(params.includes('Unbezahlt'));
                        t.assertTrue(params.includes('BezahltOffen'));
                        t.assertFalse(params.includes('BezahltAusgezahlt'));
                    }
                },
                {
                    name: 'Mit showPaid=true werden in seller auch ausgezahlte Objekte eingeblendet',
                    fn(t) {
                        t.reset();
                        t.app.addSellerItem({ sellerName: 'A', sellerIban: 'DE89370400440532013000', param: 'Unbezahlt', price: 10 });
                        const c = t.app.addSellerItem({ sellerName: 'C', sellerIban: 'DE89370400440532013000', param: 'BezahltAusgezahlt', price: 30 });
                        t.app.setSellerPaid(c.id, 'elektronisch');
                        t.app.setSellerPaidSeller(c.id);

                        t.setMode('seller');
                        t.setShowPaid(true);
                        const list = t.getRenderedItems();
                        t.assertEqual(list.length, 2);
                    }
                }
            ]
        },
        {
            name: '5. Filterlogik: Modus „An Verkäufer erstatten“ (payout)',
            tests: [
                {
                    name: 'Unbezahlte Objekte werden in payout NIE angezeigt',
                    fn(t) {
                        t.reset();
                        t.app.addSellerItem({ sellerName: 'A', sellerIban: 'DE89370400440532013000', param: 'Unbezahlt', price: 10 });
                        t.setMode('payout');
                        t.setShowReimbursed(false);
                        t.assertEqual(t.getRenderedItems().length, 0, 'Unbezahlt darf in payout nie erscheinen');
                        t.setShowReimbursed(true);
                        t.assertEqual(t.getRenderedItems().length, 0, 'Unbezahlt darf auch bei showReimbursed=true nicht erscheinen');
                    }
                },
                {
                    name: 'Standardmäßig werden nur offene Erstattungen angezeigt',
                    fn(t) {
                        t.reset();
                        const b1 = t.app.addSellerItem({ sellerName: 'B', sellerIban: 'DE89370400440532013000', param: 'Offen1', price: 20 });
                        t.app.setSellerPaid(b1.id, 'bar');
                        const b2 = t.app.addSellerItem({ sellerName: 'C', sellerIban: 'DE89370400440532013000', param: 'Erstattet', price: 30 });
                        t.app.setSellerPaid(b2.id, 'elektronisch');
                        t.app.setSellerPaidSeller(b2.id);

                        t.setMode('payout');
                        t.setShowReimbursed(false);
                        const list = t.getRenderedItems();
                        t.assertEqual(list.length, 1);
                        t.assertEqual(list[0].param, 'Offen1');
                    }
                },
                {
                    name: 'Mit showReimbursed=true werden auch bereits erstattete Objekte angezeigt',
                    fn(t) {
                        t.reset();
                        const b1 = t.app.addSellerItem({ sellerName: 'B', sellerIban: 'DE89370400440532013000', param: 'Offen1', price: 20 });
                        t.app.setSellerPaid(b1.id, 'bar');
                        const b2 = t.app.addSellerItem({ sellerName: 'C', sellerIban: 'DE89370400440532013000', param: 'Erstattet', price: 30 });
                        t.app.setSellerPaid(b2.id, 'elektronisch');
                        t.app.setSellerPaidSeller(b2.id);

                        t.setMode('payout');
                        t.setShowReimbursed(true);
                        const list = t.getRenderedItems();
                        t.assertEqual(list.length, 2);
                    }
                },
                {
                    name: 'Sortierung nach Bezahldatum: älteste Zahlungen stehen oben',
                    fn(t) {
                        t.reset();
                        const r1 = t.app.addSellerItem({ sellerName: 'A', sellerIban: 'DE89370400440532013000', param: 'Mittel', price: 20 });
                        const r2 = t.app.addSellerItem({ sellerName: 'B', sellerIban: 'DE89370400440532013000', param: 'Alt', price: 30 });
                        const r3 = t.app.addSellerItem({ sellerName: 'C', sellerIban: 'DE89370400440532013000', param: 'Neu', price: 40 });

                        t.app.updateSellerItem(r1.id, { ...r1, paid: true, paidMethod: 'bar', paidAt: '2026-09-05T12:00:00Z', sellerPaid: false });
                        t.app.updateSellerItem(r2.id, { ...r2, paid: true, paidMethod: 'bar', paidAt: '2026-09-05T10:00:00Z', sellerPaid: false });
                        t.app.updateSellerItem(r3.id, { ...r3, paid: true, paidMethod: 'bar', paidAt: '2026-09-05T14:00:00Z', sellerPaid: false });

                        t.setMode('payout');
                        const list = t.getRenderedItems();
                        t.assertEqual(list.length, 3);
                        t.assertEqual(list[0].param, 'Alt', 'Älteste Zahlung (10:00) muss auf Platz 1 sein');
                        t.assertEqual(list[1].param, 'Mittel', 'Mittlere Zahlung (12:00) muss auf Platz 2 sein');
                        t.assertEqual(list[2].param, 'Neu', 'Neueste Zahlung (14:00) muss auf Platz 3 sein');
                    }
                }
            ]
        },
        {
            name: '6. Kassenabrechnung & Summen (updateFooterSums)',
            tests: [
                {
                    name: 'Berechnet Kassenbestände, Provisionen und Auszahlungen korrekt',
                    fn(t) {
                        t.reset();
                        t.app.saveSettings({ ...t.app.getSettings(), commissionPercent: 10 });

                        // Objekt 1: 100 EUR, bar bezahlt vom Käufer, an Verkäufer ausgezahlt (90 EUR bei 10% Provision)
                        const o1 = t.app.addSellerItem({ sellerName: 'S1', sellerIban: 'DE89370400440532013000', param: 'Rad 1', price: 100 });
                        t.app.setSellerPaid(o1.id, 'bar');
                        t.app.setSellerPaidSeller(o1.id);

                        // Objekt 2: 50 EUR, elektronisch bezahlt vom Käufer, noch nicht an Verkäufer ausgezahlt
                        const o2 = t.app.addSellerItem({ sellerName: 'S2', sellerIban: 'DE89370400440532013000', param: 'Rad 2', price: 50 });
                        t.app.setSellerPaid(o2.id, 'elektronisch');

                        // Objekt 3: 40 EUR, noch unbezahlt mit Verkäufer-IBAN
                        const o3 = t.app.addSellerItem({ sellerName: 'S3', sellerIban: 'DE89370400440532013000', param: 'Rad 3', price: 40 });

                        t.app.updateFooterSums();

                        const sumPaid = t.getFooterSum('sumPaid');
                        const sumBar = t.getFooterSum('sumBar');
                        const sumSellerPaid = t.getFooterSum('sumSellerPaid');
                        const sumPending = t.getFooterSum('sumPendingToSeller');

                        t.assertEqual(sumPaid, '150,00', 'Summe bezahlt muss 150,00 sein (o1 + o2)');
                        t.assertEqual(sumBar, '100,00', 'Summe Bar muss 100,00 sein (o1)');
                        t.assertEqual(sumSellerPaid, '90,00', 'An Verkäufer gezahlt: 100 EUR - 10% = 90,00 EUR');
                        t.assertEqual(sumPending, '40,00', 'Möglicher Ausgleich an Verkäufer: 40,00 EUR (o3)');
                    }
                }
            ]
        },
        {
            name: '7. Formularmasken: Neuanlage vs. Bearbeiten',
            tests: [
                {
                    name: 'Im Dialog „Neues Objekt anlegen“ ist der Status-Container ausgeblendet',
                    fn(t) {
                        t.reset();
                        t.app.openSellerFormOverlay(); // ohne ID = Neuanlage
                        const container = t.getElementById('sellerStatusContainer');
                        t.assertTrue(container.classList.contains('hidden'), 'Status-Container muss bei Neuanlage hidden sein');
                        const paidCb = t.getElementById('sellerEditPaid');
                        const sellerPaidCb = t.getElementById('sellerEditSellerPaid');
                        t.assertFalse(paidCb.checked, 'Bezahlt-Checkbox muss bei Neuanlage uncheck sein');
                        t.assertFalse(sellerPaidCb.checked, 'Ausgezahlt-Checkbox muss bei Neuanlage uncheck sein');
                        t.app.closeSellerFormOverlay();
                    }
                },
                {
                    name: 'Im Dialog „Objekt bearbeiten“ ist der Status-Container eingeblendet',
                    fn(t) {
                        t.reset();
                        const item = t.app.addSellerItem({ sellerName: 'S1', sellerIban: 'DE89370400440532013000', param: 'Rad 1', price: 100 });
                        t.app.setSellerPaid(item.id, 'bar');
                        t.app.openSellerFormOverlay(item.id); // mit ID = Bearbeiten
                        const container = t.getElementById('sellerStatusContainer');
                        t.assertFalse(container.classList.contains('hidden'), 'Status-Container darf bei Bearbeiten nicht hidden sein');
                        const paidCb = t.getElementById('sellerEditPaid');
                        t.assertTrue(paidCb.checked, 'Bezahlt-Checkbox muss den Wert des Objekts widerspiegeln (true)');
                        t.app.closeSellerFormOverlay();
                    }
                }
            ]
        },
        {
            name: '8. Mehrfachauswahl & Auszahlung (payout vs. sell)',
            tests: [
                {
                    name: 'Im Modus Verkaufen (sell) sind Mehrfachauswahl und „An Verkäufer zahlen“ deaktiviert',
                    fn(t) {
                        t.reset();
                        const item1 = t.app.addSellerItem({ sellerName: 'S1', sellerIban: 'DE89370400440532013000', param: 'Rad 1', price: 100 });
                        t.app.setSellerPaid(item1.id, 'bar');
                        const item2 = t.app.addSellerItem({ sellerName: 'S1', sellerIban: 'DE89370400440532013000', param: 'Rad 2', price: 50 });
                        
                        t.setMode('sell');
                        t.setShowPaid(true); // damit auch bezahlte angezeigt werden
                        
                        const html = t.getRenderedHtml();
                        t.assertFalse(html.includes('seller-select-cb'), 'In sell darf keine Mehrfachauswahl-Checkbox vorhanden sein');
                        t.assertFalse(html.includes('data-action="paySeller"'), 'In sell darf kein „An Verkäufer zahlen“-Button vorhanden sein');
                        
                        const hint = t.querySelector('.seller-toolbar-hint');
                        if (hint) {
                            t.assertTrue(hint.classList.contains('hidden'), 'Hinweistext zur Mehrfachauswahl muss in sell hidden sein');
                        }
                    }
                },
                {
                    name: 'Im Modus „An Verkäufer erstatten“ (payout) sind Mehrfachauswahl und Auszahlung aktiv wenn mehrere mit gleicher IBAN da sind',
                    fn(t) {
                        t.reset();
                        const item1 = t.app.addSellerItem({ sellerName: 'S1', sellerIban: 'DE89370400440532013000', param: 'Rad 1', price: 100 });
                        t.app.setSellerPaid(item1.id, 'bar');
                        const item2 = t.app.addSellerItem({ sellerName: 'S1', sellerIban: 'DE89370400440532013000', param: 'Rad 2', price: 60 });
                        t.app.setSellerPaid(item2.id, 'bar');
                        
                        t.setMode('payout');
                        const html = t.getRenderedHtml();
                        
                        t.assertTrue(html.includes('seller-select-cb'), 'In payout muss Mehrfachauswahl-Checkbox vorhanden sein, wenn mehrere mit gleicher IBAN da sind');
                        t.assertTrue(html.includes('data-action="paySeller"'), 'In payout muss „An Verkäufer zahlen“-Button vorhanden sein');
                        
                        const hint = t.querySelector('.seller-toolbar-hint');
                        if (hint) {
                            t.assertFalse(hint.classList.contains('hidden'), 'Hinweistext zur Mehrfachauswahl darf in payout nicht hidden sein');
                        }
                    }
                },
                {
                    name: 'Ein einzelnes Objekt ohne weitere Einträge mit gleicher IBAN hat KEINEN Selektionshaken',
                    fn(t) {
                        t.reset();
                        const itemSingle = t.app.addSellerItem({ sellerName: 'Alleiniger Verkäufer', sellerIban: 'DE89370400440532013000', param: 'Einzelrad', price: 200 });
                        t.app.setSellerPaid(itemSingle.id, 'bar');
                        
                        t.setMode('payout');
                        const html = t.getRenderedHtml();
                        
                        // Auszahl-Button muss da sein
                        t.assertTrue(html.includes('data-action="paySeller"'), 'Button „An Verkäufer zahlen“ muss für Einzelobjekt vorhanden sein');
                        // Aber KEINE Mehrfachauswahl-Checkbox!
                        t.assertFalse(html.includes('seller-select-cb'), 'Einzelobjekt ohne weitere Einträge gleicher IBAN darf KEINE Checkbox haben');
                        
                        // toggleSellerSelection muss false liefern
                        const ok = t.app.toggleSellerSelection(itemSingle.id, true);
                        t.assertFalse(ok, 'Einzelobjekt darf nicht über Mehrfachauswahl selektiert werden können');
                        t.assertEqual(t.app.getSelectedSellerItemIds().length, 0, 'Auswahl muss leer sein');
                    }
                },
                {
                    name: 'Objekte mit gleicher IBAN können zusammen ausgewählt werden',
                    fn(t) {
                        t.reset();
                        const item1 = t.app.addSellerItem({ sellerName: 'S1', sellerIban: 'DE89370400440532013000', param: 'Rad 1', price: 100 });
                        t.app.setSellerPaid(item1.id, 'bar');
                        const item2 = t.app.addSellerItem({ sellerName: 'S1', sellerIban: 'DE89 3704 0044 0532 0130 00', param: 'Rad 2', price: 80 }); // Formatierungsvariante
                        t.app.setSellerPaid(item2.id, 'elektronisch');
                        
                        t.setMode('payout');
                        
                        const ok1 = t.app.toggleSellerSelection(item1.id, true);
                        t.assertTrue(ok1, 'Erstes Objekt mit IBAN muss selektierbar sein');
                        
                        const ok2 = t.app.toggleSellerSelection(item2.id, true);
                        t.assertTrue(ok2, 'Zweites Objekt mit gleicher IBAN muss selektierbar sein');
                        
                        const selected = t.app.getSelectedSellerItemIds();
                        t.assertEqual(selected.length, 2, 'Beide Objekte müssen ausgewählt sein');
                        t.assertTrue(selected.includes(item1.id), 'Item 1 in Auswahl');
                        t.assertTrue(selected.includes(item2.id), 'Item 2 in Auswahl');
                    }
                },
                {
                    name: 'Auswahl eines Selektionshakens filtert Ansicht automatisch durch Eintragen der IBAN ins Filterfeld',
                    fn(t) {
                        t.reset();
                        const itemA1 = t.app.addSellerItem({ sellerName: 'Verkäufer A', sellerIban: 'DE89370400440532013000', param: 'Rad A1', price: 100 });
                        t.app.setSellerPaid(itemA1.id, 'bar');
                        const itemA2 = t.app.addSellerItem({ sellerName: 'Verkäufer A', sellerIban: 'DE89370400440532013000', param: 'Rad A2', price: 80 });
                        t.app.setSellerPaid(itemA2.id, 'bar');
                        const itemB1 = t.app.addSellerItem({ sellerName: 'Verkäufer B', sellerIban: 'DE02100100100155635399', param: 'Rad B1', price: 120 });
                        t.app.setSellerPaid(itemB1.id, 'bar');
                        const itemB2 = t.app.addSellerItem({ sellerName: 'Verkäufer B', sellerIban: 'DE02100100100155635399', param: 'Rad B2', price: 110 });
                        t.app.setSellerPaid(itemB2.id, 'bar');
                        
                        t.setMode('payout');
                        
                        // Vor der Auswahl: Filterfeld ist leer, alle Objekte werden gerendert
                        let html = t.getRenderedHtml();
                        t.assertTrue(html.includes('Rad A1') && html.includes('Rad B1'), 'Vor Auswahl sind alle Objekte sichtbar');
                        
                        // Item A1 auswählen
                        t.assertTrue(t.app.toggleSellerSelection(itemA1.id, true), 'Item A1 ausgewählt');
                        
                        // Filterfeld muss automatisch mit formatierter IBAN befüllt sein
                        const filterVal = t.getElementById('sellerFilterSeller').value;
                        t.assertTrue(filterVal.includes('DE89') && filterVal.includes('3704'), 'IBAN muss automatisch im Filterfeld stehen');
                        
                        // Nach Rendern: Nur noch Items mit gleicher IBAN sichtbar
                        t.app.renderSellerList();
                        html = t.getRenderedHtml();
                        t.assertTrue(html.includes('Rad A1'), 'Rad A1 muss sichtbar sein');
                        t.assertTrue(html.includes('Rad A2'), 'Rad A2 (gleiche IBAN) muss sichtbar sein');
                        t.assertFalse(html.includes('Rad B1'), 'Rad B1 (andere IBAN) muss herausgefiltert sein');
                        t.assertFalse(html.includes('Rad B2'), 'Rad B2 (andere IBAN) muss herausgefiltert sein');
                        
                        // Deselektieren von Item A1: Filterfeld wird automatisch wieder geleert
                        t.app.toggleSellerSelection(itemA1.id, false);
                        t.assertEqual(t.getElementById('sellerFilterSeller').value, '', 'Filterfeld muss nach vollständiger Abwahl geleert werden');
                        t.app.renderSellerList();
                        html = t.getRenderedHtml();
                        t.assertTrue(html.includes('Rad B1'), 'Nach Abwahl sind andere Verkäufer wieder sichtbar');
                    }
                },
                {
                    name: 'Objekte mit unterschiedlicher IBAN können NICHT ausgewählt werden und sind disabled (auch bei gelöschtem Filter)',
                    fn(t) {
                        t.reset();
                        const itemA1 = t.app.addSellerItem({ sellerName: 'Verkäufer A', sellerIban: 'DE89370400440532013000', param: 'Rad A1', price: 100 });
                        t.app.setSellerPaid(itemA1.id, 'bar');
                        const itemA2 = t.app.addSellerItem({ sellerName: 'Verkäufer A', sellerIban: 'DE89370400440532013000', param: 'Rad A2', price: 80 });
                        t.app.setSellerPaid(itemA2.id, 'bar');
                        const itemB1 = t.app.addSellerItem({ sellerName: 'Verkäufer B', sellerIban: 'DE02100100100155635399', param: 'Rad B1', price: 120 });
                        t.app.setSellerPaid(itemB1.id, 'bar');
                        const itemB2 = t.app.addSellerItem({ sellerName: 'Verkäufer B', sellerIban: 'DE02100100100155635399', param: 'Rad B2', price: 110 });
                        t.app.setSellerPaid(itemB2.id, 'bar');
                        
                        t.setMode('payout');
                        
                        // Item A1 auswählen (setzt automatisch IBAN ins Filterfeld)
                        t.assertTrue(t.app.toggleSellerSelection(itemA1.id, true), 'Item A1 muss ausgewählt werden können');
                        
                        // Filter manuell leeren (Simulation: Anwender löscht den Filter)
                        const filterInput = t.getElementById('sellerFilterSeller');
                        if (filterInput) filterInput.value = '';
                        t.app.renderSellerList();
                        
                        // Versuch, Item B1 (andere IBAN) auszuwählen -> muss trotz leerem Filter fehlschlagen!
                        const okB = t.app.toggleSellerSelection(itemB1.id, true);
                        t.assertFalse(okB, 'Item B1 mit anderer IBAN darf trotz gelöschtem Filter NICHT ausgewählt werden können');
                        
                        const selected = t.app.getSelectedSellerItemIds();
                        t.assertEqual(selected.length, 1, 'Nur Item A1 darf in der Auswahl sein');
                        t.assertTrue(selected.includes(itemA1.id), 'Item A1 ist in der Auswahl');
                        t.assertFalse(selected.includes(itemB1.id), 'Item B1 darf nicht in der Auswahl sein');
                        
                        // DOM-Prüfung: Checkbox von Item B1 und B2 muss disabled sein
                        const html = t.getRenderedHtml();
                        t.assertTrue(html.includes('seller-item-select disabled'), 'Klasse .disabled muss auf dem Label für abweichende IBAN vorhanden sein');
                        t.assertTrue(html.includes('disabled'), 'Checkbox für abweichende IBAN muss disabled sein');
                    }
                },
                {
                    name: 'Objekt ohne IBAN kann nicht für Auszahlung ausgewählt werden',
                    fn(t) {
                        t.reset();
                        const itemNoIban = t.app.addSellerItem({ sellerName: '', sellerIban: '', param: 'Spende Rad', price: 50 });
                        t.app.setSellerPaid(itemNoIban.id, 'bar');
                        
                        t.setMode('payout');
                        const ok = t.app.toggleSellerSelection(itemNoIban.id, true);
                        t.assertFalse(ok, 'Objekt ohne IBAN darf nicht ausgewählt werden können');
                        t.assertEqual(t.app.getSelectedSellerItemIds().length, 0, 'Auswahl muss leer sein');
                    }
                },
                {
                    name: 'Moduswechsel weg von payout leert die Mehrfachauswahl und verbirgt die Auswahlleiste',
                    fn(t) {
                        t.reset();
                        const item1 = t.app.addSellerItem({ sellerName: 'S1', sellerIban: 'DE89370400440532013000', param: 'Rad 1', price: 100 });
                        t.app.setSellerPaid(item1.id, 'bar');
                        const item2 = t.app.addSellerItem({ sellerName: 'S1', sellerIban: 'DE89370400440532013000', param: 'Rad 2', price: 50 });
                        t.app.setSellerPaid(item2.id, 'bar');
                        
                        t.setMode('payout');
                        t.app.toggleSellerSelection(item1.id, true);
                        t.app.updateSellerSelectionBar();
                        
                        t.assertEqual(t.app.getSelectedSellerItemIds().length, 1, '1 Item ausgewählt');
                        const bar = t.getElementById('sellerSelectionBar');
                        t.assertFalse(bar.classList.contains('hidden'), 'Auswahlleiste muss sichtbar sein');
                        
                        // Moduswechsel zu sell
                        t.setMode('sell');
                        t.assertEqual(t.app.getSelectedSellerItemIds().length, 0, 'Auswahl muss nach Wechsel zu sell geleert sein');
                        t.assertTrue(bar.classList.contains('hidden'), 'Auswahlleiste muss nach Wechsel zu sell verborgen sein');
                    }
                }
            ]
        }
    ];

    return suites;
});
