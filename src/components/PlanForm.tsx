'use client'

import React, { useState, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TravelInfo {
  destination?: string;
  dates?: string;
  travelers?: string;
  budget?: string;
  preferences?: string;
  duration?: string;
  accommodation?: string;
  activities?: string;
  dietary?: string;
}

export default function PlanForm() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [travelInfo, setTravelInfo] = useState<TravelInfo>({});
  const [conversationStep, setConversationStep] = useState(0);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hello! I'm your AI travel assistant. I'd love to help you plan the perfect trip! Let's start by getting to know what you're looking for.\n\nWhere would you like to go?",
        timestamp: new Date()
      }]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message to chat
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    // Simulate bot thinking time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Generate bot response based on conversation
    const botResponse = generateBotResponse(userMessage, travelInfo, conversationStep);
    
    const newBotMessage: Message = {
      role: 'assistant',
      content: botResponse.message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newBotMessage]);
    setTravelInfo(botResponse.updatedInfo);
    setConversationStep(botResponse.nextStep);
    setIsLoading(false);
  };

  const generateBotResponse = (userInput: string, currentInfo: TravelInfo, step: number) => {
    const input = userInput.toLowerCase();
    let updatedInfo = { ...currentInfo };
    let nextStep = step;
    let message = '';

    // Extract information from user input based on keywords
    const extractInfo = () => {
      // Destination detection
      if (!updatedInfo.destination) {
        const destinations = ['paris', 'rome', 'london', 'tokyo', 'new york', 'bali', 'greece', 'italy', 'spain', 'france', 'japan', 'thailand', 'india', 'australia', 'germany', 'portugal', 'mexico', 'brazil', 'egypt', 'turkey', 'morocco', 'iceland', 'norway', 'sweden', 'amsterdam', 'barcelona', 'madrid', 'dublin', 'prague', 'vienna', 'budapest', 'croatia', 'slovenia', 'poland', 'peru', 'chile', 'argentina', 'colombia', 'costa rica', 'vietnam', 'cambodia', 'laos', 'myanmar', 'singapore', 'malaysia', 'indonesia', 'philippines', 'south korea', 'china', 'russia', 'kenya', 'tanzania', 'south africa', 'botswana', 'namibia', 'madagascar'];
        const foundDest = destinations.find(dest => input.includes(dest));
        if (foundDest) {
          updatedInfo.destination = userInput;
          return true;
        }
      }

      // Date detection
      if (!updatedInfo.dates) {
        const dateKeywords = ['december', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'summer', 'winter', 'spring', 'autumn', 'fall', '2024', '2025', 'next month', 'week', 'day', 'weekend'];
        if (dateKeywords.some(keyword => input.includes(keyword))) {
          updatedInfo.dates = userInput;
          return true;
        }
      }

      // Travelers detection
      if (!updatedInfo.travelers) {
        const travelerKeywords = ['2', 'couple', 'family', 'solo', 'alone', 'myself', 'friends', 'group', 'people', 'person', 'adult', 'child', 'kid'];
        if (travelerKeywords.some(keyword => input.includes(keyword))) {
          updatedInfo.travelers = userInput;
          return true;
        }
      }

      // Budget detection
      if (!updatedInfo.budget) {
        const budgetKeywords = ['$', '£', 'euro', 'thousand', 'budget', 'cheap', 'luxury', 'expensive', 'affordable', 'cost', 'price', 'money'];
        if (budgetKeywords.some(keyword => input.includes(keyword))) {
          updatedInfo.budget = userInput;
          return true;
        }
      }

      // Duration detection
      if (!updatedInfo.duration) {
        const durationKeywords = ['days', 'weeks', 'month', 'weekend', 'week', 'night', 'day'];
        if (durationKeywords.some(keyword => input.includes(keyword))) {
          updatedInfo.duration = userInput;
          return true;
        }
      }

      // Accommodation detection
      if (!updatedInfo.accommodation) {
        const accommKeywords = ['hotel', 'hostel', 'airbnb', 'resort', 'villa', 'apartment', 'bed and breakfast', 'motel', 'lodge', 'cabin'];
        if (accommKeywords.some(keyword => input.includes(keyword))) {
          updatedInfo.accommodation = userInput;
          return true;
        }
      }

      // Activity preferences detection
      if (!updatedInfo.activities) {
        const activityKeywords = ['museum', 'beach', 'hiking', 'shopping', 'restaurant', 'nightlife', 'culture', 'adventure', 'relaxing', 'sightseeing', 'food', 'wine', 'spa', 'temple', 'church', 'park', 'zoo', 'aquarium'];
        if (activityKeywords.some(keyword => input.includes(keyword))) {
          updatedInfo.activities = userInput;
          return true;
        }
      }

      return false;
    };

    // Try to extract information first
    const infoExtracted = extractInfo();

    // Determine conversation flow
    if (!updatedInfo.destination) {
      if (infoExtracted) {
        message = `Great choice! ${updatedInfo.destination} sounds amazing. ✈️\n\nWhen are you planning to travel? Please let me know your preferred dates or timeframe.`;
        nextStep = 1;
      } else {
        message = `I'd love to help you plan your trip! Let's start with the basics.\n\nWhere would you like to go? You can mention a city, country, or even describe the type of place you're interested in.`;
        nextStep = 0;
      }
    }
    else if (!updatedInfo.dates) {
      if (infoExtracted) {
        message = `Perfect! I've noted your travel dates as ${updatedInfo.dates}. 📅\n\nHow long are you planning to stay? (e.g., 5 days, 2 weeks, a long weekend)`;
        nextStep = 2;
      } else {
        message = `Thanks for that information! When are you planning to travel? Please let me know your preferred dates or timeframe.`;
        nextStep = 1;
      }
    }
    else if (!updatedInfo.duration) {
      if (infoExtracted) {
        message = `Got it! A ${updatedInfo.duration} trip sounds perfect. ⏰\n\nHow many people will be traveling? Just yourself, or will you have companions?`;
        nextStep = 3;
      } else {
        message = `Great! How long are you planning to stay? This helps me create the perfect itinerary length.`;
        nextStep = 2;
      }
    }
    else if (!updatedInfo.travelers) {
      if (infoExtracted) {
        message = `Perfect! Traveling ${updatedInfo.travelers}. 👥\n\nWhat's your approximate budget for this trip? This helps me recommend the best options for you.`;
        nextStep = 4;
      } else {
        message = `Excellent! How many people will be traveling? This helps me suggest appropriate accommodations and activities.`;
        nextStep = 3;
      }
    }
    else if (!updatedInfo.budget) {
      if (infoExtracted) {
        message = `Thanks for sharing your budget: ${updatedInfo.budget}. 💰\n\nWhat type of accommodation do you prefer? (e.g., luxury hotel, boutique hotel, Airbnb, hostel)`;
        nextStep = 5;
      } else {
        message = `Great! What's your approximate budget range? This helps me filter options that work for you.`;
        nextStep = 4;
      }
    }
    else if (!updatedInfo.accommodation) {
      if (infoExtracted) {
        message = `Excellent choice! ${updatedInfo.accommodation} it is. 🏨\n\nWhat type of experiences are you most interested in? (e.g., cultural exploration, adventure activities, relaxing beaches, food & wine, nightlife)`;
        nextStep = 6;
      } else {
        message = `Perfect! What type of accommodation do you prefer? This helps me find the best places to stay.`;
        nextStep = 5;
      }
    }
    else if (!updatedInfo.activities) {
      if (infoExtracted) {
        message = `Wonderful! I love that you're interested in ${updatedInfo.activities}. 🎯\n\nDo you have any dietary restrictions or food preferences I should know about? (e.g., vegetarian, vegan, no allergies, love local cuisine)`;
        nextStep = 7;
      } else {
        message = `Fantastic! What type of experiences are you most interested in? This helps me plan the perfect activities.`;
        nextStep = 6;
      }
    }
    else if (!updatedInfo.dietary) {
      if (infoExtracted) {
        updatedInfo.dietary = userInput;
        message = `Perfect! I've noted your food preferences: ${updatedInfo.dietary}. 🍽️\n\nI now have all the information I need to create your perfect travel plan!`;
        nextStep = 8;
      } else {
        message = `Great! Do you have any dietary restrictions or food preferences I should know about?`;
        nextStep = 7;
      }
    }
    else if (step >= 8) {
      // Generate comprehensive travel plan
      message = generateComprehensivePlan(updatedInfo);
      nextStep = 9;
    }

    return {
      message,
      updatedInfo,
      nextStep
    };
  };

  const generateComprehensivePlan = (info: TravelInfo) => {
    return `Perfect! I've created your personalized travel plan. Here's what I found for you:

**Trip Summary**
${info.destination} • ${info.dates} • ${info.duration} • ${info.travelers} • ${info.budget}

**Accommodation Options**

I found 3 great places that match your preference for ${info.accommodation}:

**Hotel Central Plaza**
• Prime location in city center  
• Excellent reviews (4.8/5 stars)
• Walking distance to main attractions
*$150-200/night*

**Local Boutique Guesthouse**
• Authentic local experience
• Great breakfast included  
• Friendly local hosts
*$80-120/night*

**Modern Apartment Rental**
• Perfect for groups/families
• Full kitchen facilities
• Quiet residential area
*$100-150/night*

**Daily Itinerary**

**Day 1: Arrival**
Morning: Airport transfer & check-in
Afternoon: Walking tour of historic district  
Evening: Welcome dinner at local restaurant

**Day 2: Cultural Experience**
Morning: Visit famous museums
Afternoon: Local market exploration
Evening: Traditional cultural performance

**Day 3: ${info.activities || 'Activities'}**
Full day of experiences you're interested in
Authentic local lunch included
Evening at leisure

**Dining Recommendations**

Based on your dietary preferences (${info.dietary}):

• **Ristorante Bella Vista** - Award-winning local cuisine
• **Fusion Kitchen** - International menu with local twist  
• **Street Food Tour** - Best local specialties
• **Dietary-Friendly Options** - Restaurants catering to your needs

**Transportation**
• Airport transfers included
• Local transport passes provided
• Optional day trip car rental available
• Most attractions within walking distance

**Budget Breakdown**
• Accommodation: 40%
• Dining: 25% 
• Activities: 20%
• Transport: 10%
• Extras: 5%

Would you like me to adjust anything or help you book these options?`;
  };

  const handleQuickStart = (prompt: string) => {
    setInputValue(prompt);
  };

  const quickStarters = [
    "I want to go to Paris in December",
    "Planning a family trip to Tokyo",
    "Looking for a romantic getaway to Italy", 
    "Budget backpacking trip to Spain"
  ];

  return (
    <div className="h-full flex flex-col rounded-2xl overflow-hidden">
      {/* Chat Header */}
      <div className="flex-shrink-0 bg-[#F6F8FA] border-b border-[#E6E6E6] px-6 py-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#0A66FF] rounded-full flex items-center justify-center">
              <span className="text-white text-sm">AI</span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#111]">Travel Assistant</h3>
              <p className="text-xs text-[#666]">Ready to plan your trip</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area - Fills the container */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-4 h-full">
          {messages.map((message, index) => (
            <div key={index} className="space-y-1">
              {message.role === 'user' ? (
                /* User Bubble - Brand Accent */
                <div className="flex justify-end">
                  <div className="max-w-[70%]">
                    <div className="bg-[#0A66FF] text-white px-4 py-3 rounded-2xl">
                      <div className="text-sm leading-[1.5] whitespace-pre-wrap">{message.content}</div>
                    </div>
                    <div className="text-xs text-[#666] text-right mt-1 px-2">
                      {message.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Assistant Bubble - Light Gray */
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="bg-[#F6F8FA] text-[#111] px-4 py-3 rounded-2xl">
                      <div className="text-sm leading-[1.5] whitespace-pre-wrap">{message.content}</div>
                    </div>
                    <div className="text-xs text-[#666] text-left mt-1 px-2">
                      {message.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#F6F8FA] text-[#111] px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-[#666] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#666] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-[#666] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm text-[#666]">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Action Chips */}
          {messages.length === 1 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {quickStarters.map((starter, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickStart(starter)}
                    className="px-3 py-2 bg-white border border-[#E6E6E6] text-[#111] text-sm rounded-full hover:bg-[#F6F8FA] transition-colors"
                    disabled={isLoading}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Bottom of container, extended to match quickstart buttons */}
      <div className="flex-shrink-0 border-t border-[#E6E6E6] bg-[#F6F8FA] px-6 py-4 rounded-b-2xl">
        <div className="flex justify-start">
          <form onSubmit={handleSubmit} className="relative w-[75%]">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Tell me about your travel plans..."
              className="w-full px-4 py-3 pr-12 text-sm border border-[#E6E6E6] rounded-full focus:outline-none focus:ring-1 focus:ring-[#0A66FF] focus:border-[#0A66FF] text-[#111] placeholder-[#666] bg-white"
              disabled={isLoading}
              autoFocus
            />
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-[#0A66FF] hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}