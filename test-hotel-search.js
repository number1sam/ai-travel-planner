// Test script to verify hotel search functionality
const testHotelSearch = async () => {
  console.log('🧪 Testing hotel search API...\n');
  
  const testCases = [
    {
      city: 'Tenerife',
      checkIn: '2025-08-15',
      checkOut: '2025-08-20',
      travelers: 2,
      budget: 1000,
      accommodationType: 'hotel'
    },
    {
      city: 'Rome',
      checkIn: '2025-08-15',
      checkOut: '2025-08-20',
      travelers: 2,
      budget: 1000,
      accommodationType: 'hotel'
    },
    {
      city: 'Paris',
      checkIn: '2025-09-10',
      checkOut: '2025-09-15',
      travelers: 2,
      budget: 1500,
      accommodationType: 'luxury'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📍 Testing: ${testCase.city}`);
    console.log(`   Dates: ${testCase.checkIn} to ${testCase.checkOut}`);
    console.log(`   Budget: £${testCase.budget}`);
    
    try {
      const response = await fetch('http://localhost:3001/api/hotels/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase)
      });
      
      const data = await response.json();
      
      if (data.success && data.hotels?.hotels?.length > 0) {
        console.log(`✅ Found ${data.hotels.hotels.length} hotels:`);
        
        data.hotels.hotels.slice(0, 2).forEach(hotel => {
          console.log(`\n   🏨 ${hotel.name}`);
          console.log(`      • Rating: ${hotel.rating}/5`);
          console.log(`      • Price: £${hotel.pricePerNight}/night`);
          console.log(`      • Location: ${hotel.location}`);
          console.log(`      • Score: ${hotel.score}`);
        });
      } else {
        console.log('❌ No hotels found');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
};

// Run the test
testHotelSearch().catch(console.error);