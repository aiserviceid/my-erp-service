const fs = require('fs');
const path = 'src/pages/AdminDashboard.jsx';
let text = fs.readFileSync(path, 'utf8');
const start = text.indexOf("activeTab === 'keuangan' ? (");
const end = text.indexOf(") : activeTab === 'karyawan' ? (", start);
if (start < 0 || end < 0) {
  throw new Error('Finance branch markers not found');
}
const replacement = `activeTab === 'keuangan' ? (
          <div className="glass-panel finance-report" style={{ minHeight: '400px', animation: 'fadeIn 0.3s ease-in-out' }}>
            <PremiumFinanceReport transactions={transactions} services={services} products={products} users={users} tenant={tenant} />
            <SecurityReadinessPanel tenant={tenant} users={users} products={products} services={services} transactions={transactions} />
          </div>
        `;
text = text.slice(0, start) + replacement + text.slice(end);
fs.writeFileSync(path, text);
console.log('Finance report deduped');
