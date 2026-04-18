import Navbar from '@/app/components/Navbar'

const sampleHistory = [
  { unit: 'Condo 1, Unit 101', date: 'Mar 2024', price: '$385,000', sqft: '1,200', ppsf: '$320.83' },
  { unit: 'Condo 2, Unit 205', date: 'Feb 2024', price: '$410,000', sqft: '1,350', ppsf: '$303.70' },
  { unit: 'Condo 3, Unit 308', date: 'Jan 2024', price: '$455,000', sqft: '1,500', ppsf: '$303.33' },
  { unit: 'Condo 4, Unit 112', date: 'Dec 2023', price: '$325,000', sqft: '950', ppsf: '$342.11' },
  { unit: 'Condo 1, Unit 204', date: 'Nov 2023', price: '$440,000', sqft: '1,450', ppsf: '$303.45' },
  { unit: 'Condo 2, Unit 301', date: 'Oct 2023', price: '$498,000', sqft: '1,800', ppsf: '$276.67' },
  { unit: 'Condo 3, Unit 110', date: 'Sep 2023', price: '$372,500', sqft: '1,150', ppsf: '$323.91' },
  { unit: 'Condo 4, Unit 207', date: 'Aug 2023', price: '$395,000', sqft: '1,250', ppsf: '$316.00' },
  { unit: 'Condo 1, Unit 305', date: 'Jul 2023', price: '$462,000', sqft: '1,550', ppsf: '$298.06' },
  { unit: 'Condo 2, Unit 102', date: 'Jun 2023', price: '$310,000', sqft: '900', ppsf: '$344.44' },
  { unit: 'Condo 3, Unit 215', date: 'May 2023', price: '$428,000', sqft: '1,400', ppsf: '$305.71' },
  { unit: 'Condo 4, Unit 303', date: 'Apr 2023', price: '$475,000', sqft: '1,600', ppsf: '$296.88' },
]

// Summary stats
const avgPrice = '$413,042'
const avgPpsf = '$311.26'
const totalSales = '12'
const priceRange = '$310,000 - $498,000'

export default function SalesHistory() {
  return (
    <div className="min-h-screen bg-secondary">
      <Navbar />

      {/* Page Hero */}
      <section className="relative pt-32 pb-20 bg-accent">
        <div className="absolute inset-0 z-0">
          <img src="/images/cta-bg.jpg" alt="" className="w-full h-full object-cover opacity-20" />
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Sales Price History</h1>
          <p className="text-[#9b9b9b] text-lg">Historical sales data for Scarborough Glen</p>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="container mx-auto px-4 mt-8">
        <div className="bg-primary/15 border-l-4 border-primary p-4">
          <p className="text-sm text-white">
            <strong>Disclaimer:</strong> These are example values for demonstration purposes only. They do not represent actual sales data for Scarborough Glen.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12">
        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-10">
          <div className="card text-center">
            <p className="text-[#9b9b9b] text-sm mb-1">Total Sales (12 mo)</p>
            <p className="text-3xl font-bold text-primary">{totalSales}</p>
          </div>
          <div className="card text-center">
            <p className="text-[#9b9b9b] text-sm mb-1">Average Sale Price</p>
            <p className="text-3xl font-bold text-primary">{avgPrice}</p>
          </div>
          <div className="card text-center">
            <p className="text-[#9b9b9b] text-sm mb-1">Avg Price / SqFt</p>
            <p className="text-3xl font-bold text-primary">{avgPpsf}</p>
          </div>
          <div className="card text-center">
            <p className="text-[#9b9b9b] text-sm mb-1">Price Range</p>
            <p className="text-2xl font-bold text-primary">{priceRange}</p>
          </div>
        </div>

        {/* Sales Table */}
        <div className="card">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Sales</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark border-b border-accent">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#9b9b9b]">Unit</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#9b9b9b]">Sale Date</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[#9b9b9b]">Sale Price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[#9b9b9b]">SqFt</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-[#9b9b9b]">Price / SqFt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent">
                {sampleHistory.map((sale, idx) => (
                  <tr key={idx} className="hover:bg-dark transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-white">{sale.unit}</td>
                    <td className="px-4 py-3 text-sm text-[#9b9b9b]">{sale.date}</td>
                    <td className="px-4 py-3 text-sm text-right text-primary font-semibold">{sale.price}</td>
                    <td className="px-4 py-3 text-sm text-right text-[#9b9b9b]">{sale.sqft}</td>
                    <td className="px-4 py-3 text-sm text-right text-[#9b9b9b]">{sale.ppsf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary py-6">
        <div className="container mx-auto px-4 text-center text-white">
          <p>&copy; 2024 Scarborough Glen HOA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
