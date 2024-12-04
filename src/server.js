const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const TZ = 'Asia/Jerusalem';
const { createObjectCsvWriter } = require('csv-writer');

const app = express();
const port = 3000;

app.use(express.static('public')); // הגדרת תיקיית הסטטיים
app.use(express.json()); // תמיכה בקלט JSON

// שם הקובץ שהאפליקציה תכתוב אליו
const currentMonth = moment().tz(TZ).format('YYYY-MM');
const dataDir = './data';  // תיקיית ה-CSV
const csvFileName = `./data/${currentMonth}.csv`;

// פונקציה לעדכון דוח הנוכחות
function logAttendance(action) {
    const currentDay = moment().tz(TZ).format('DD'); // מספר היום בחודש
    const currentWeekday = moment().tz(TZ).format('ddd'); // שם היום בשבוע
    const currentTime = moment().tz(TZ).format('HH:mm'); // זמן בלי שניות (רק שעה ודקה)

    // אם הקובץ לא קיים, ניצור אותו עם כותרות ראשוניות
    if (!fs.existsSync(csvFileName)) {
        const csvWriter = createObjectCsvWriter({
            path: csvFileName,
            header: [
                { id: 'dayOfMonth', title: 'תאריך' },  // היום בחודש
                { id: 'dayOfWeek', title: 'יום' },    // היום בשבוע
                { id: 'entry', title: 'כניסה' },             // כניסה
                { id: 'exit', title: 'יציאה' }                // יציאה
            ]
        });
        csvWriter.writeRecords([]); // כותבים רשומות ראשוניות ריקות
    }

    // קריאה לקובץ CSV
    fs.readFile(csvFileName, 'utf8', (err, data) => {
        if (err) throw err;

        // קריאת רשומות קיימות מהקובץ ומסננים שורות ריקות אם יש
        const records = data.split('\n').slice(1).map(line => {
            const columns = line.split(',');
            if (columns.length < 4) return null;  // מסננים שורות ריקות
            return {
                dayOfMonth: columns[0],
                dayOfWeek: columns[1],
                entry: columns[2],
                exit: columns[3]
            };
        }).filter(record => record !== null);  // מסננים כל ערך null (שורות ריקות)

        // פורמט של היום, כולל היום בשבוע
        const formattedDayOfMonth = `${currentDay}`;
        const formattedDayOfWeek = `${currentWeekday}`;

        // אם יש רשומת כניסה פתוחה (שאין יציאה בשלב זה)
        const existingEntry = records.find(record => record.dayOfMonth === formattedDayOfMonth && record.entry !== '' && record.exit === '');

        if (action === 'entry') {
            if (existingEntry) {
                // אם יש כניסה פתוחה, לא נוסיף שורה חדשה
                console.log('Entry already recorded for today:', formattedDayOfMonth, formattedDayOfWeek);
            }
            else {
                // אם לא קיימת כניסת יום, נוסיף כניסה חדשה בשורה נפרדת
                const newRecord = {
                    dayOfMonth: formattedDayOfMonth,
                    dayOfWeek: formattedDayOfWeek,
                    entry: currentTime,
                    exit: ''
                };
                records.push(newRecord);
                console.log('Entry recorded for today:', formattedDayOfMonth, formattedDayOfWeek, currentTime);
            }
        }
        else if (action === 'exit') {
            if (existingEntry) {
                // אם יש כניסה פתוחה, נוסיף את זמן היציאה באותה שורה
                existingEntry.exit = currentTime;
                console.log('Exit recorded for today:', formattedDayOfMonth, formattedDayOfWeek, currentTime);
            }
            else {
                // אם אין כניסת יום פתוחה, נוסיף יציאה בשורה חדשה
                const newRecord = {
                    dayOfMonth: formattedDayOfMonth,
                    dayOfWeek: formattedDayOfWeek,
                    entry: '',
                    exit: currentTime
                };
                records.push(newRecord);
                console.log('Exit recorded for today (without entry):', formattedDayOfMonth, formattedDayOfWeek, currentTime);
            }
        }

        // כותבים את הרשומות המעודכנות חזרה לקובץ CSV, ללא שורות ריקות
        const csvWriter = createObjectCsvWriter({
            path: csvFileName,
            header: [
                { id: 'dayOfMonth', title: 'תאריך' },  // היום בחודש
                { id: 'dayOfWeek', title: 'יום' },    // היום בשבוע
                { id: 'entry', title: 'כניסה' },             // כניסה
                { id: 'exit', title: 'יציאה' }                // יציאה
            ]
        });

        csvWriter.writeRecords(records)
            .then(() => console.log('Attendance record updated:', formattedDayOfMonth, formattedDayOfWeek, action, currentTime));
    });
}

// נתיב עבור כפתור "כניסה"
app.post('/entry', (req, res) => {
    logAttendance('entry');
    res.send('כניסה תועדה');
});

// נתיב עבור כפתור "יציאה"
app.post('/exit', (req, res) => {
    logAttendance('exit');
    res.send('יציאה תועדה');
});

// נתיב שמחזיר את רשימת החודשים הקיימים במערכת
app.get('/months', (req, res) => {
    fs.readdir(dataDir, (err, files) => {
        if (err) {
            return res.status(500).send('Error reading files from the data directory');
        }

        // סינון רק קבצי CSV (קבצים שמתחילים ב-YYYY-MM)
        const months = files.filter(file => file.endsWith('.csv'))
            .map(file => file.replace('.csv', ''));  // חותך את הסיומת .csv

        // מחזירים את רשימת החודשים
        res.json(months);
    });
});

// נתיב להורדת דוח נוכחות (הצגת דוח)
app.get('/report/download/:month', (req, res) => {
    const month = req.params.month;
    const csvFileName = path.join(dataDir, `${month}.csv`);
    res.sendFile(path.join(__dirname, csvFileName));
});

// נתיב להצגת דוח נוכחות כ-HTML
// נתיב להצגת דוח נוכחות כ-HTML עבור חודש נבחר
app.get('/report/get/:month', (req, res) => {
    const month = req.params.month;
    const csvFileName = path.join(dataDir, `${month}.csv`);

    fs.readFile(csvFileName, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading the attendance report');
        }

        // פיצול הקובץ לשורות ומסננים שורות ריקות
        const records = data.split('\n').slice(1).map(line => {
            const columns = line.split(',');
            return {
                dayOfMonth: columns[0],
                dayOfWeek: columns[1],
                entry: columns[2],
                exit: columns[3]
            };
        }).filter(record => record.dayOfMonth && record.dayOfWeek && record.entry && record.exit);  // מסננים שורות ריקות

        // יצירת HTML עם טבלה
        let htmlContent = `
            <table>
                <tr>
                    <th>תאריך</th>
                    <th>יום</th>
                    <th>כניסה</th>
                    <th>יציאה</th>
                </tr>
        `;

        // הוספת כל הרשומות לטבלה
        records.forEach(record => {
            htmlContent += `
                <tr>
                    <td>${record.dayOfMonth}</td>
                    <td>${record.dayOfWeek}</td>
                    <td>${record.entry}</td>
                    <td>${record.exit}</td>
                </tr>
            `;
        });

        htmlContent += `
            </table>
        `;

        // שולחים את ה-HTML לדפדפן
        res.send(htmlContent);
    });
});

// אתחול השרת
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
