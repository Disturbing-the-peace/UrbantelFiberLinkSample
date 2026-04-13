'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { Plan } from '@/types';
import LocationPicker, { LocationData } from '@/components/LocationPicker';
import ImageUpload from '@/components/ImageUpload';
import { plansApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

function ApplicationFormContent() {
  const searchParams = useSearchParams();
  const agentRef = searchParams.get('ref');
  const toast = useToast();
  const { resolvedTheme } = useTheme();

  const [currentStep, setCurrentStep] = useState(1);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'Residential' | 'Business' | null>(null);
  const [selectedPlanType, setSelectedPlanType] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [location, setLocation] = useState<LocationData | null>(null);
  
  const [uploadedImages, setUploadedImages] = useState<{
    housePhoto: File | null;
    governmentIdWithSignature: File | null;
    idSelfie: File | null;
    proofOfBilling: File | null;
    proofOfIncome: File | null;
  }>({
    housePhoto: null,
    governmentIdWithSignature: null,
    idSelfie: null,
    proofOfBilling: null,
    proofOfIncome: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    firstName?: string;
    lastName?: string;
    birthday?: string;
    phoneNumber?: string;
  }>({});

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await plansApi.getAll();
      setPlans(data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast.error('Failed to load plans. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (locationData: LocationData) => {
    setLocation(locationData);
  };

  const handleImageChange = (name: string, file: File | null) => {
    setUploadedImages(prev => ({ ...prev, [name]: file }));
  };

  // Validation functions
  const validateName = (name: string, fieldName: string): string | undefined => {
    if (!name.trim()) {
      return `${fieldName} is required`;
    }
    if (name.trim().length < 2) {
      return `${fieldName} must be at least 2 characters`;
    }
    if (!/^[a-zA-Z\s\u00C0-\u017F\u1E00-\u1EFF]+$/.test(name)) {
      return `${fieldName} can only contain letters`;
    }
    if (name.length > 100) {
      return `${fieldName} is too long`;
    }
    return undefined;
  };

  const validateBirthday = (date: string): string | undefined => {
    if (!date) {
      return 'Birthday is required';
    }
    
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      // Adjust age if birthday hasn't occurred this year
    }
    
    if (birthDate > today) {
      return 'Birthday cannot be in the future';
    }
    
    if (age < 18) {
      return 'Must be 18 years or older';
    }
    
    if (age > 120) {
      return 'Please check the birthday';
    }
    
    return undefined;
  };

  const validatePhoneNumber = (phone: string): string | undefined => {
    if (!phone.trim()) {
      return 'Phone number is required';
    }
    
    // Remove spaces and dashes
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    // Check if it's a valid Philippine mobile number
    if (!/^(09|\+639)\d{9}$/.test(cleanPhone)) {
      return 'Please enter a valid number (e.g., 09123456789)';
    }
    
    return undefined;
  };

  const validateStep1 = (): boolean => {
    const errors: typeof validationErrors = {};
    
    errors.firstName = validateName(firstName, 'Ngalan');
    errors.lastName = validateName(lastName, 'Apelyido');
    errors.birthday = validateBirthday(birthday);
    errors.phoneNumber = validatePhoneNumber(phoneNumber);
    
    setValidationErrors(errors);
    
    // Return true if no errors
    return !Object.values(errors).some(error => error !== undefined);
  };

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    if (validationErrors.firstName) {
      setValidationErrors(prev => ({ ...prev, firstName: validateName(value, 'First Name') }));
    }
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
    if (validationErrors.lastName) {
      setValidationErrors(prev => ({ ...prev, lastName: validateName(value, 'Last Name') }));
    }
  };

  const handleBirthdayChange = (value: string) => {
    setBirthday(value);
    if (validationErrors.birthday) {
      setValidationErrors(prev => ({ ...prev, birthday: validateBirthday(value) }));
    }
  };

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value);
    if (validationErrors.phoneNumber) {
      setValidationErrors(prev => ({ ...prev, phoneNumber: validatePhoneNumber(value) }));
    }
  };

  const handleSubmit = async () => {
    // Final validation before submission
    if (!uploadedImages.housePhoto || !uploadedImages.governmentIdWithSignature || !uploadedImages.idSelfie) {
      toast.error('Palihug i-upload ang tanan nga kinahanglanon nga dokumento');
      return;
    }

    // Validate proof of billing if required
    if (requiresProofOfBilling && !uploadedImages.proofOfBilling) {
      toast.error('Proof of billing kinahanglan para sa plano nga ₱2000 ug pataas');
      return;
    }

    // Validate proof of income if required
    if (requiresProofOfIncome && !uploadedImages.proofOfIncome) {
      toast.error('Proof of income kinahanglan para sa plano nga ₱3000 ug pataas');
      return;
    }
    
    const loadingToast = toast.loading('Submitting your application...');
    setSubmitting(true);
    setSubmitError(null);

    try {
      const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      };

      const images = {
        housePhoto: await fileToBase64(uploadedImages.housePhoto!),
        governmentId: await fileToBase64(uploadedImages.governmentIdWithSignature!),
        signature: await fileToBase64(uploadedImages.governmentIdWithSignature!), // Same image for both
        idSelfie: await fileToBase64(uploadedImages.idSelfie!),
        proofOfBilling: uploadedImages.proofOfBilling ? await fileToBase64(uploadedImages.proofOfBilling) : undefined,
        proofOfIncome: uploadedImages.proofOfIncome ? await fileToBase64(uploadedImages.proofOfIncome) : undefined,
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/customers/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          middleName,
          lastName,
          birthday,
          phoneNumber,
          address: location?.address || '',
          latitude: location?.latitude,
          longitude: location?.longitude,
          planId: selectedPlanId,
          agentRef,
          images,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Application submission failed:', data);
        throw new Error(data.error || data.details || 'Failed to submit application');
      }

      toast.dismiss(loadingToast);
      toast.success('Application submitted successfully!');
      setSubmitSuccess(true);
    } catch (error) {
      console.error('Submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit application';
      setSubmitError(errorMessage);
      toast.dismiss(loadingToast);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPlans = selectedCategory ? plans.filter(plan => plan.category === selectedCategory) : [];
  
  // Group plans by type
  const getPlanType = (planName: string): string => {
    // Residential plans
    if (planName.includes('Super FiberX')) return 'Super FiberX';
    if (planName.includes('Netflix')) return 'Netflix Plans';
    if (planName.includes('GameChanger')) return 'GameChanger';
    if (planName.includes('FiberX')) return 'FiberX';
    
    // Business plans
    if (planName.includes('BizEdge')) return 'BizEdge';
    if (planName.includes('FlexiBIZ')) return 'FlexiBIZ';
    if (planName.includes('MicroBIZ')) return 'MicroBIZ Max';
    
    return 'Other';
  };

  const plansByType = filteredPlans.reduce((acc, plan) => {
    const type = getPlanType(plan.name);
    if (!acc[type]) acc[type] = [];
    acc[type].push(plan);
    return acc;
  }, {} as Record<string, typeof filteredPlans>);

  const planTypes = Object.keys(plansByType);
  const selectedTypePlans = selectedPlanType ? plansByType[selectedPlanType] || [] : [];
  const selectedPlan = plans.find(plan => plan.id === selectedPlanId);

  // Check if proof of billing is required (plans >= 2000)
  const requiresProofOfBilling = selectedPlan ? selectedPlan.price >= 2000 : false;
  // Check if proof of income is required (plans >= 3000)
  const requiresProofOfIncome = selectedPlan ? selectedPlan.price >= 3000 : false;

  const canProceedToStep2 = firstName && lastName && birthday && phoneNumber;
  const canProceedToStep3 = selectedPlanId;
  const canProceedToStep4 = location && location.address && location.latitude && location.longitude;
  const canSubmit = 
    uploadedImages.housePhoto && 
    uploadedImages.governmentIdWithSignature && 
    uploadedImages.idSelfie &&
    (!requiresProofOfBilling || uploadedImages.proofOfBilling) &&
    (!requiresProofOfIncome || uploadedImages.proofOfIncome);

  const nextStep = () => {
    // Validate Step 1 before proceeding
    if (currentStep === 1) {
      if (!validateStep1()) {
        toast.error('Palihug i-check ang mga sayop sa form');
        return;
      }
    }
    
    // Validate Step 2 (Plan Selection)
    if (currentStep === 2 && !selectedPlanId) {
      toast.error('Palihug pilia og plano');
      return;
    }
    
    // Validate Step 3 (Location)
    if (currentStep === 3) {
      if (!location || !location.address || !location.latitude || !location.longitude) {
        toast.error('Palihug pilia og lokasyon sa mapa');
        return;
      }
    }
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!agentRef) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Referral Link</h1>
          <p className="text-gray-600">
            This application form requires a valid agent referral code. Please contact your agent for the correct link.
          </p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your application. We will review your information and contact you soon.
          </p>
          <p className="text-sm text-gray-500">
            Your application has been successfully submitted and is now under review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 sm:py-12 px-3 sm:px-6 lg:px-8 relative">
      {/* Background Logos - Lower Right */}
      <div className="fixed bottom-8 right-8 flex items-center gap-4 opacity-20 pointer-events-none z-0">
        <img 
          src="/cverge.png" 
          alt="Converge" 
          className="h-12 sm:h-16 md:h-20 w-auto"
        />
        <img 
          src={resolvedTheme === 'dark' ? "/urbantelwhite.png" : "/urbantel.png"}
          alt="UrbanTel" 
          className="h-12 sm:h-16 md:h-20 w-auto"
        />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Progress Steps */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-semibold transition-all ${
                      currentStep >= step
                        ? 'bg-teal-600 text-white shadow-lg'
                        : 'bg-white text-gray-400 border-2 border-gray-300'
                    }`}
                  >
                    {currentStep > step ? (
                      <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      step
                    )}
                  </div>
                  <span className={`mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium ${
                    currentStep >= step ? 'text-teal-600' : 'text-gray-400'
                  }`}>
                    {step === 1 && 'Personal'}
                    {step === 2 && 'Plano'}
                    {step === 3 && 'Lokasyon'}
                    {step === 4 && 'Dokumento'}
                  </span>
                </div>
                {step < 4 && (
                  <div
                    className={`h-0.5 sm:h-1 flex-1 mx-1 sm:mx-2 transition-all ${
                      currentStep > step ? 'bg-teal-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white shadow-2xl rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300">
          {/* Header with Banner Background */}
          <div 
            className="relative px-4 sm:px-6 py-8 sm:py-12 text-white bg-cover bg-center"
            style={{
              backgroundImage: 'url(/banner.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-indigo-900/80"></div>
            
            {/* Content */}
            <div className="relative z-10 flex items-center gap-4">
              <img 
                src="/Clogo.png" 
                alt="Converge ICT Logo" 
                className="h-12 sm:h-16 w-auto drop-shadow-lg"
              />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold drop-shadow-lg">Converge ICT</h1>
                <p className="mt-2 text-sm sm:text-base text-blue-100 drop-shadow-md">
                  {currentStep === 1 && 'Sultihi kami bahin kanimo'}
                  {currentStep === 2 && 'Pilia ang imong plano'}
                  {currentStep === 3 && 'Asa namo i-install?'}
                  {currentStep === 4 && 'I-upload ang mga dokumento'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 min-h-[400px] sm:min-h-[500px]">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4 sm:space-y-6">
                {/* Debug Info - Commented out for production */}
                {/* <div className="p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg text-xs">
                  <p className="font-bold mb-1">🔍 Debug (v3 - Separate States):</p>
                  <p>Ngalan: "{firstName}" ({firstName.length} chars)</p>
                  <p>Apelyido: "{lastName}" ({lastName.length} chars)</p>
                  <p>Adlaw sa Pagkatawo: "{birthday}"</p>
                  <p>Numero sa Telepono: "{phoneNumber}"</p>
                  <p className="mt-2 font-bold">Makapadayon: {canProceedToStep2 ? '✅ OO' : '❌ DILI'}</p>
                  <button 
                    type="button"
                    onClick={() => {
                      alert('Button gi-klik!');
                      setFirstName('TestFirst');
                      setLastName('TestLast');
                      setBirthday('2000-01-01');
                      setPhoneNumber('09123456789');
                    }}
                    className="mt-2 px-3 py-2 bg-teal-600 text-white rounded font-bold"
                  >
                    TEST BUTTON - I-klik Ko!
                  </button>
                </div> */}
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={firstName}
                      onChange={(e) => handleFirstNameChange(e.target.value)}
                      required
                      minLength={2}
                      maxLength={100}
                      className={`w-full px-3 sm:px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        validationErrors.firstName 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="Isulod ang imong ngalan"
                    />
                    {validationErrors.firstName && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {validationErrors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-2">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      id="middleName"
                      name="middleName"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      maxLength={100}
                      className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Isulod ang tunga nga ngalan (opsyonal)"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={lastName}
                      onChange={(e) => handleLastNameChange(e.target.value)}
                      required
                      minLength={2}
                      maxLength={100}
                      className={`w-full px-3 sm:px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        validationErrors.lastName 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="Isulod ang imong apelyido"
                    />
                    {validationErrors.lastName && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {validationErrors.lastName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-2">
                      Birthday <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="birthday"
                      name="birthday"
                      value={birthday}
                      onChange={(e) => handleBirthdayChange(e.target.value)}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      min={new Date(new Date().getFullYear() - 120, 0, 1).toISOString().split('T')[0]}
                      className={`w-full px-3 sm:px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        validationErrors.birthday 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-gray-300 focus:border-blue-500'
                      }`}
                    />
                    {validationErrors.birthday && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {validationErrors.birthday}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Kinahanglan 18 anyos pataas</p>
                  </div>

                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneNumberChange(e.target.value)}
                      required
                      pattern="^(09|\+639)[0-9]{9}$"
                      maxLength={11}
                      className={`w-full px-3 sm:px-4 py-3 text-base border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                        validationErrors.phoneNumber 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="09123456789"
                    />
                    {validationErrors.phoneNumber && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {validationErrors.phoneNumber}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">11 ka numero (e.g., 09123456789)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Plan Selection - 3 Levels */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Level 1: Choose Category (Residential/Business) */}
                {!selectedCategory && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 text-center mb-6">
                      Pilia ang Tipo sa Plano
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Residential Card */}
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('Residential')}
                        className="group relative bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-teal-300 rounded-2xl p-8 transition-all hover:shadow-xl hover:scale-105 active:scale-100"
                      >
                        <div className="text-center">
                          <div className="w-20 h-20 mx-auto mb-4 bg-teal-500 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                          </div>
                          <h4 className="text-2xl font-bold text-teal-900 mb-2">Residential</h4>
                          <p className="text-sm text-blue-700">Perpekto para sa balay</p>
                        </div>
                      </button>

                      {/* Business Card */}
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('Business')}
                        className="group relative bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 border-2 border-teal-300 rounded-2xl p-8 transition-all hover:shadow-xl hover:scale-105 active:scale-100"
                      >
                        <div className="text-center">
                          <div className="w-20 h-20 mx-auto mb-4 bg-teal-500 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <h4 className="text-2xl font-bold text-teal-900 mb-2">Business</h4>
                          <p className="text-sm text-teal-700">Maayo para sa negosyo</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Level 2: Choose Plan Type (Super FiberX, Netflix, GameChanger, etc.) */}
                {selectedCategory && !selectedPlanType && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Pilia ang Tipo sa Plano
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(null);
                          setSelectedPlanType(null);
                          setSelectedPlanId('');
                        }}
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Balik
                      </button>
                    </div>

                    {loading ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
                        <p className="mt-4 text-gray-600">Nag-load sa mga plano...</p>
                      </div>
                    ) : planTypes.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">Walay {selectedCategory} nga plano karon.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {planTypes.map((type) => {
                          // Icons for residential plans
                          const residentialIcons: Record<string, string> = {
                            'Super FiberX': '🚀',
                            'Netflix Plans': '🎬',
                            'GameChanger': '🎮',
                            'FiberX': '⚡'
                          };
                          
                          // Icons for business plans
                          const businessIcons: Record<string, string> = {
                            'BizEdge': '💼',
                            'FlexiBIZ': '🏢',
                            'MicroBIZ Max': '🏪'
                          };
                          
                          const typeIcon = selectedCategory === 'Residential' 
                            ? (residentialIcons[type] || '⚡')
                            : (businessIcons[type] || '💼');
                          
                          // Colors for residential plans
                          const residentialColors: Record<string, string> = {
                            'Super FiberX': 'from-green-50 to-green-100 border-green-300',
                            'Netflix Plans': 'from-red-50 to-red-100 border-red-300',
                            'GameChanger': 'from-teal-50 to-teal-100 border-teal-300',
                            'FiberX': 'from-blue-50 to-blue-100 border-teal-300'
                          };
                          
                          // Colors for business plans
                          const businessColors: Record<string, string> = {
                            'BizEdge': 'from-indigo-50 to-indigo-100 border-indigo-300',
                            'FlexiBIZ': 'from-cyan-50 to-cyan-100 border-cyan-300',
                            'MicroBIZ Max': 'from-teal-50 to-teal-100 border-teal-300'
                          };
                          
                          const typeColor = selectedCategory === 'Residential'
                            ? (residentialColors[type] || 'from-blue-50 to-blue-100 border-teal-300')
                            : (businessColors[type] || 'from-gray-50 to-gray-100 border-gray-300');
                          
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSelectedPlanType(type)}
                              className={`bg-gradient-to-br ${typeColor} border-2 rounded-xl p-6 transition-all hover:shadow-lg hover:scale-105 active:scale-100`}
                            >
                              <div className="text-center">
                                <div className="text-4xl mb-3">{typeIcon}</div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">{type}</h4>
                                <p className="text-sm text-gray-600">{plansByType[type].length} ka plano</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Level 3: Choose Specific Plan */}
                {selectedCategory && selectedPlanType && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedPlanType}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlanType(null);
                          setSelectedPlanId('');
                        }}
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedTypePlans.map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`relative overflow-hidden rounded-3xl transition-all ${
                            selectedPlanId === plan.id
                              ? 'ring-4 ring-teal-400 shadow-2xl scale-105'
                              : 'hover:shadow-xl hover:scale-102'
                          }`}
                        >
                          {/* Speed Header - Purple Gradient */}
                          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-8 text-center">
                            <p className="text-white text-sm font-medium mb-2">Up to</p>
                            <p className="text-white text-4xl sm:text-5xl font-bold">
                              {plan.speed.split(' ')[0]}
                            </p>
                            <p className="text-white text-2xl font-semibold">
                              {plan.speed.includes('Mbps') ? 'Mbps' : plan.speed.split(' ').slice(1).join(' ')}
                            </p>
                          </div>

                          {/* Plan Details - White Background */}
                          <div className="bg-white px-6 py-6 text-left">
                            {/* Plan Name */}
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                              {plan.name.replace(/FiberX|Super|Netflix|GameChanger/gi, '').trim() || plan.name}
                            </h3>

                            {/* Description */}
                            <p className="text-gray-600 text-sm mb-4 min-h-[40px]">
                              {plan.inclusions.slice(0, 2).join(' • ')}
                            </p>

                            {/* Price */}
                            <div className="flex items-baseline mb-6">
                              <span className="text-teal-600 text-3xl font-bold">₱{plan.price.toLocaleString()}</span>
                              <span className="text-gray-600 text-lg ml-1">/mo</span>
                            </div>

                            {/* Select Button */}
                            <div className={`w-full py-4 rounded-full text-center font-semibold text-lg transition-all ${
                              selectedPlanId === plan.id
                                ? 'bg-teal-600 text-white'
                                : 'bg-teal-500 text-white hover:bg-teal-600'
                            }`}>
                              {selectedPlanId === plan.id ? '✓ Napili' : 'Konektahi karon'}
                            </div>

                            {/* All Inclusions - Small Text */}
                            {plan.inclusions.length > 1 && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-500 font-medium mb-2">Naglakip:</p>
                                <ul className="space-y-1">
                                  {plan.inclusions.map((inclusion, idx) => (
                                    <li key={idx} className="text-xs text-gray-600 flex items-start">
                                      <svg className="w-3 h-3 text-teal-500 mr-1.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      {inclusion}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Selected Indicator Badge */}
                          {selectedPlanId === plan.id && (
                            <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg">
                              <svg className="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm sm:text-base mb-4">
                  📍 I-klik o i-tap ang mapa aron pilion ang eksaktong lokasyon sa pag-install
                </p>
                {!canProceedToStep4 && location && (
                  <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                    <p className="text-xs sm:text-sm text-yellow-800 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Palihug i-klik ang mapa aron makuha ang lokasyon
                    </p>
                  </div>
                )}
                {canProceedToStep4 && (
                  <div className="p-3 bg-green-50 border border-green-300 rounded-lg mb-4">
                    <p className="text-xs sm:text-sm text-green-800 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Lokasyon napili: {location?.address}
                    </p>
                  </div>
                )}
                <LocationPicker 
                  onLocationChange={handleLocationChange}
                  initialLocation={location || undefined}
                />
              </div>
            )}

            {/* Step 4: Document Upload */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {!canSubmit && (
                  <div className="p-3 bg-teal-50 border border-teal-300 rounded-lg mb-4">
                    <p className="text-xs sm:text-sm text-teal-800 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Palihug i-upload ang tanan nga kinahanglanon nga dokumento
                    </p>
                  </div>
                )}
                
                <ImageUpload
                  label="Litrato sa Balay"
                  name="housePhoto"
                  description="Kinahanglan namo og tin-aw nga litrato sa gawas sa imong balay aron matabangan ang among mga teknisyan sa pagpangita sa imong property ug pagplano sa ruta sa fiber installation."
                  icon={
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  }
                  required
                  onImageChange={handleImageChange}
                  maxSizeMB={5}
                />
                
                <ImageUpload
                  label="Government ID uban sa Pirma"
                  name="governmentIdWithSignature"
                  description="I-upload ang litrato nga nagpakita sa imong balido nga government-issued ID (driver's license, passport, o national ID) uban sa imong pirma nga makita sa samang imahe. Kini nagpamatuod sa imong identidad."
                  icon={
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  }
                  required
                  onImageChange={handleImageChange}
                  maxSizeMB={5}
                />
                
                <ImageUpload
                  label="Selfie uban sa ID"
                  name="idSelfie"
                  description="Kuhaa og selfie nga naghupot sa imong government ID tupad sa imong nawong. Kini nagkumpirma nga ikaw ang tinuod nga tag-iya sa ID ug nagpugong sa identity fraud."
                  icon={
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                  required
                  onImageChange={handleImageChange}
                  maxSizeMB={5}
                />

                {/* Conditional: Proof of Billing (for plans >= 2000) */}
                {requiresProofOfBilling && (
                  <div className="border-t-2 border-teal-200 pt-6">
                    <div className="mb-4 p-4 bg-teal-50 border border-teal-300 rounded-lg">
                      <p className="text-sm text-teal-900 font-semibold flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Dugang nga Dokumento para sa Plano nga ₱{selectedPlan?.price.toLocaleString()}
                      </p>
                      <p className="text-xs text-teal-800 mt-2">
                        Ang imong napiling plano nagkinahanglan og dugang nga proof of billing. 
                        Ang dokumento kinahanglan dated within 3 months sa dili pa ang application.
                      </p>
                    </div>

                    <ImageUpload
                      label="Proof of Billing"
                      name="proofOfBilling"
                      description="I-upload ang utility bill (kuryente, tubig, internet) o similar nga dokumento nga nagpakita sa imong address. Kinahanglan dated within 3 months (e.g., Enero-Marso 2026 para sa Abril 2026 application)."
                      icon={
                        <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      }
                      required
                      onImageChange={handleImageChange}
                      maxSizeMB={5}
                    />
                  </div>
                )}

                {/* Conditional: Proof of Income (for plans >= 3000) */}
                {requiresProofOfIncome && (
                  <div className={requiresProofOfBilling ? '' : 'border-t-2 border-teal-200 pt-6'}>
                    {!requiresProofOfBilling && (
                      <div className="mb-4 p-4 bg-teal-50 border border-teal-300 rounded-lg">
                        <p className="text-sm text-teal-900 font-semibold flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Dugang nga Dokumento para sa Plano nga ₱{selectedPlan?.price.toLocaleString()}
                        </p>
                        <p className="text-xs text-teal-800 mt-2">
                          Ang imong napiling plano nagkinahanglan og dugang nga proof of income. 
                          Ang dokumento kinahanglan dated within 3 months sa dili pa ang application.
                        </p>
                      </div>
                    )}

                    <ImageUpload
                      label="Proof of Income"
                      name="proofOfIncome"
                      description="I-upload ang payslip, ITR (Income Tax Return), Certificate of Employment with salary, o similar nga dokumento nga nagpakita sa imong kita. Kinahanglan dated within 3 months (e.g., Enero-Marso 2026 para sa Abril 2026 application)."
                      icon={
                        <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      }
                      required
                      onImageChange={handleImageChange}
                      maxSizeMB={5}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
              {submitError && (
                <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs sm:text-sm text-red-600">{submitError}</p>
                </div>
              )}
              
              <div className="flex justify-between items-center gap-3 sm:gap-4">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-4 sm:px-6 py-3 bg-gray-100 text-gray-700 text-sm sm:text-base font-medium rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-all flex items-center touch-manipulation"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Balik
                  </button>
                ) : (
                  <div className="text-xs sm:text-sm text-gray-500">
                    Ref: <span className="font-mono font-semibold">{agentRef}</span>
                  </div>
                )}
                
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={
                      (currentStep === 1 && !canProceedToStep2) ||
                      (currentStep === 2 && !canProceedToStep3) ||
                      (currentStep === 3 && !canProceedToStep4)
                    }
                    className="ml-auto px-6 sm:px-8 py-3 bg-teal-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-teal-700 active:bg-teal-800 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 transition-all flex items-center shadow-lg touch-manipulation min-h-[44px]"
                  >
                    Sunod
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !canSubmit}
                    className="ml-auto px-6 sm:px-8 py-3 bg-green-600 text-white text-sm sm:text-base font-medium rounded-lg hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 transition-all flex items-center shadow-lg touch-manipulation min-h-[44px]"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Nag-submit...
                      </>
                    ) : (
                      <>
                        Isumite ang Aplikasyon
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApplicationForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    }>
      <ApplicationFormContent />
    </Suspense>
  );
}


