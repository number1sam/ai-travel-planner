#!/usr/bin/env node

// Debug script to trace the conversation loop issue
console.log('=== Debugging Conversation Loop Issue ===')

// Simulate the exact conversation flow that's causing the loop
const simulateConversationFlow = {
  
  // Initial state
  initialState: {
    tripDetails: {
      destination: '',
      budget: 0,
      travelers: 0,
      preferences: [],
      activities: [],
      specialRequests: []
    },
    questionsAnswered: {
      destination: false,
      budget: false,
      travelers: false,
      duration: false,
      activities: false
    },
    currentPreferenceQuestions: [],
    preferencesGathered: false
  },
  
  // Step 1: User says "Italy"
  processMessage1: (state, userMessage = "Italy") => {
    console.log('\n📝 Step 1: User says "Italy"')
    console.log(`   Input: "${userMessage}"`)
    
    // Extract destination
    const lowerMessage = userMessage.toLowerCase()
    const updates = {}
    const questionsUpdate = {}
    
    if (lowerMessage.includes('italy')) {
      updates.destination = 'Italy'
      questionsUpdate.destination = true
    }
    
    console.log(`   Extracted:`, updates)
    console.log(`   Questions updated:`, questionsUpdate)
    
    // Update state
    const newState = {
      ...state,
      tripDetails: { ...state.tripDetails, ...updates },
      questionsAnswered: { ...state.questionsAnswered, ...questionsUpdate }
    }
    
    // Check what happens next
    if (updates.destination && !state.preferencesGathered && state.currentPreferenceQuestions.length === 0) {
      const detailedQuestions = [
        "What kind of activities interest you most in Italy?",
        "What's your preferred travel pace?",
        "Any dietary preferences?"
      ]
      newState.currentPreferenceQuestions = detailedQuestions
      
      const response = `Italy is a fantastic choice! 🎉 To create the perfect itinerary for you, I'd love to learn more about your preferences. 

${detailedQuestions[0]}

Please tell me what interests you most, and I'll ask a few more questions to personalize your trip perfectly!`
      
      console.log('   Bot Response:', response.substring(0, 100) + '...')
      return { state: newState, response }
    }
    
    return { state: newState, response: 'Unexpected flow' }
  },
  
  // Step 2: User says "sight seeing in rome" 
  processMessage2: (state, userMessage = "sight seeing in rome") => {
    console.log('\n📝 Step 2: User says "sight seeing in rome"')
    console.log(`   Input: "${userMessage}"`)
    console.log(`   Current state:`)
    console.log(`     - preferencesGathered: ${state.preferencesGathered}`)
    console.log(`     - currentPreferenceQuestions.length: ${state.currentPreferenceQuestions.length}`)
    
    // Extract preferences
    const lowerMessage = userMessage.toLowerCase()
    const newPreferences = []
    
    // Check for sightseeing
    if (lowerMessage.includes('sightseeing') || lowerMessage.includes('sight seeing')) {
      newPreferences.push('sightseeing')
    }
    
    console.log(`   Extracted preferences:`, newPreferences)
    
    // This is the critical check - are we in preference gathering mode?
    const inPreferenceMode = state.currentPreferenceQuestions.length > 0 && !state.preferencesGathered
    console.log(`   In preference gathering mode: ${inPreferenceMode}`)
    
    if (inPreferenceMode) {
      // Update preferences
      const newState = {
        ...state,
        tripDetails: {
          ...state.tripDetails,
          preferences: [...state.tripDetails.preferences, ...newPreferences],
          activities: [...state.tripDetails.activities, ...newPreferences]
        }
      }
      
      console.log(`   Updated activities:`, newState.tripDetails.activities)
      
      // Check if more questions remain
      if (state.currentPreferenceQuestions.length > 1) {
        const nextQuestion = state.currentPreferenceQuestions[1]
        newState.currentPreferenceQuestions = state.currentPreferenceQuestions.slice(1)
        
        const response = `Great insights! I see you're interested in ${newPreferences.join(', ')}. That helps me understand what you're looking for. 

${nextQuestion}`
        
        console.log('   Bot Response:', response.substring(0, 100) + '...')
        return { state: newState, response }
      } else {
        // Done with preferences
        newState.preferencesGathered = true
        newState.currentPreferenceQuestions = []
        newState.questionsAnswered = { ...state.questionsAnswered, activities: true }
        
        const response = `Perfect! I have a good understanding of your interests in Italy. You're interested in ${newPreferences.join(', ')} - excellent choices! 

Now let me get the essential planning details:

How many people will be traveling?`
        
        console.log('   Bot Response:', response.substring(0, 100) + '...')
        return { state: newState, response }
      }
    } else {
      console.log('   ❌ NOT in preference gathering mode - this might be the bug!')
      return { state, response: 'Flow error - not in preference mode' }
    }
  },
  
  // Step 3: User says "rome" (this is where the loop happens)
  processMessage3: (state, userMessage = "rome") => {
    console.log('\n📝 Step 3: User says "rome" (loop trigger)')
    console.log(`   Input: "${userMessage}"`)
    console.log(`   Current state:`)
    console.log(`     - destination: ${state.tripDetails.destination}`)
    console.log(`     - preferencesGathered: ${state.preferencesGathered}`)
    console.log(`     - currentPreferenceQuestions.length: ${state.currentPreferenceQuestions.length}`)
    
    // Extract info
    const lowerMessage = userMessage.toLowerCase()
    const updates = {}
    const questionsUpdate = {}
    
    // This might extract destination again even though we already have it
    if (lowerMessage.includes('rome')) {
      updates.destination = 'Italy' // Already set, but gets set again
      questionsUpdate.destination = true
    }
    
    console.log(`   Extracted updates:`, updates)
    
    // Critical check - this condition might be triggering incorrectly
    const shouldStartPreferences = updates.destination && !state.preferencesGathered && state.currentPreferenceQuestions.length === 0
    console.log(`   Should start preferences: ${shouldStartPreferences}`)
    console.log(`     - updates.destination: ${!!updates.destination}`)
    console.log(`     - !preferencesGathered: ${!state.preferencesGathered}`)
    console.log(`     - currentPreferenceQuestions.length === 0: ${state.currentPreferenceQuestions.length === 0}`)
    
    if (shouldStartPreferences) {
      console.log('   ❌ BUG FOUND: Restarting preference questions even though we already processed them!')
      
      const detailedQuestions = [
        "What kind of activities interest you most in Italy?",
        "What's your preferred travel pace?", 
        "Any dietary preferences?"
      ]
      
      const response = `Italy is a fantastic choice! 🎉 To create the perfect itinerary for you, I'd love to learn more about your preferences. 

${detailedQuestions[0]}

Please tell me what interests you most, and I'll ask a few more questions to personalize your trip perfectly!`
      
      console.log('   ❌ Same response as Step 1 - this creates the loop!')
      return { 
        state: { ...state, currentPreferenceQuestions: detailedQuestions }, 
        response,
        isBug: true 
      }
    }
    
    return { state, response: 'No loop detected in this step' }
  }
}

// Run the simulation
function runConversationDebug() {
  console.log('\n🔍 Simulating the exact conversation flow...\n')
  
  let currentState = simulateConversationFlow.initialState
  
  // Step 1: "Italy"
  const step1 = simulateConversationFlow.processMessage1(currentState)
  currentState = step1.state
  
  // Step 2: "sight seeing in rome"
  const step2 = simulateConversationFlow.processMessage2(currentState)
  currentState = step2.state
  
  // Step 3: "rome" (the problematic one)
  const step3 = simulateConversationFlow.processMessage3(currentState)
  
  console.log('\n' + '='.repeat(60))
  console.log('🔍 ROOT CAUSE ANALYSIS')
  console.log('='.repeat(60))
  
  if (step3.isBug) {
    console.log('❌ BUG CONFIRMED: Loop detected!')
    console.log('\n🔧 The Problem:')
    console.log('  1. User says "Italy" → Bot starts preference questions')
    console.log('  2. User says "sight seeing in rome" → Bot processes preferences') 
    console.log('  3. User says "rome" → Bot extracts destination AGAIN')
    console.log('  4. Since destination is extracted, bot restarts preference questions')
    console.log('  5. This creates an infinite loop of the same question')
    
    console.log('\n💡 The Solution:')
    console.log('  The condition should check if preferences have been gathered OR')
    console.log('  if currentPreferenceQuestions.length > 0 (already in progress)')
    console.log('  ')
    console.log('  Current buggy condition:')
    console.log('    updates.destination && !preferencesGathered && currentPreferenceQuestions.length === 0')
    console.log('  ')
    console.log('  Fixed condition should be:')
    console.log('    updates.destination && !preferencesGathered && currentPreferenceQuestions.length === 0 && !alreadyAskedPreferences')
    console.log('  ')
    console.log('  OR better: Track if we\'ve already started the preference flow')
    
  } else {
    console.log('✅ No loop detected in simulation')
  }
  
  console.log('\n🚀 RECOMMENDATION:')
  console.log('  Add a flag to track when preference gathering has started,')
  console.log('  not just when it\'s completed. This prevents restarting the')
  console.log('  preference questions when the user mentions the destination again.')
}

runConversationDebug()