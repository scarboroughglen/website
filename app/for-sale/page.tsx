import Navbar from '@/app/components/Navbar'
import Link from 'next/link'

const sampleListings = [
  {
    id: 1,
    unit: 'Condo 1, Unit 203',
    price: '$425,000',
    beds: 3,
    baths: 2,
    sqft: '1,450',
    image: '/images/portfolio/product-1.jpg',
    description: 'Bright corner unit with updated kitchen, hardwood floors throughout, and mountain views from the balcony.',
  },
  {
    id: 2,
    unit: 'Condo 2, Unit 105',
    price: '$349,900',
    beds: 2,
    baths: 1,
    sqft: '1,100',
    image: '/images/portfolio/product-2.jpg',
    description: 'Ground-floor unit with private patio, new appliances, and direct access to the community garden.',
  },
  {
    id: 3,
    unit: 'Condo 3, Unit 312',
    price: '$475,000',
    beds: 3,
    baths: 2,
    sqft: '1,600',
    image: '/images/portfolio/product-3.jpg',
    description: 'Top-floor penthouse-style unit with vaulted ceilings, skylights, and panoramic neighborhood views.',
  },
  {
    id: 4,
    unit: 'Condo 1, Unit 108',
    price: '$299,000',
    beds: 1,
    baths: 1,
    sqft: '850',
    image: '/images/portfolio/product-4.jpg',
    description: 'Cozy one-bedroom with open floor plan, in-unit laundry, and reserved parking space.',
  },
  {
    id: 5,
    unit: 'Condo 4, Unit 210',
    price: '$389,500',
    beds: 2,
    baths: 2,
    sqft: '1,250',
    image: '/images/portfolio/product-5.jpg',
    description: 'Renovated unit featuring quartz countertops, spa-style bathrooms, and a large walk-in closet.',
  },
  {
    id: 6,
    unit: 'Condo 2, Unit 301',
    price: '$510,000',
    beds: 4,
    baths: 2,
    sqft: '1,800',
    image: '/images/portfolio/product-6.jpg',
    description: 'Spacious family unit with bonus room, double master suites, and recently upgraded HVAC system.',
  },
]

export default function ForSale() {
  return (
    <div className="min-h-screen bg-secondary">
      <Navbar />

      {/* Page Hero */}
      <section className="relative pt-32 pb-20 bg-accent">
        <div className="absolute inset-0 z-0">
          <img src="/images/cta-bg.jpg" alt="" className="w-full h-full object-cover opacity-20" />
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Properties For Sale</h1>
          <p className="text-[#9b9b9b] text-lg">Current listings at Scarborough Glen</p>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="container mx-auto px-4 mt-8">
        <div className="bg-primary/15 border-l-4 border-primary p-4">
          <p className="text-sm text-white">
            <strong>Disclaimer:</strong> These are example listings for demonstration purposes only. They do not represent actual properties for sale at Scarborough Glen.
          </p>
        </div>
      </div>

      {/* Listings Grid */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sampleListings.map((listing) => (
            <div key={listing.id} className="bg-accent border border-accent hover:border-primary transition-all group overflow-hidden">
              <div className="relative h-56 overflow-hidden">
                <img
                  src={listing.image}
                  alt={listing.unit}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 text-sm font-bold">
                  {listing.price}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{listing.unit}</h3>
                <p className="text-[#9b9b9b] text-sm mb-4">{listing.description}</p>
                <div className="flex gap-4 text-sm text-[#9b9b9b] mb-4">
                  <span>{listing.beds} Beds</span>
                  <span className="text-primary">|</span>
                  <span>{listing.baths} Baths</span>
                  <span className="text-primary">|</span>
                  <span>{listing.sqft} sqft</span>
                </div>
                <button className="btn-primary w-full text-center text-sm">
                  Contact for Details
                </button>
              </div>
            </div>
          ))}
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
