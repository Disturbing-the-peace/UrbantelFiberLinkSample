'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import ImageUpload from '@/components/common/ImageUpload';
import { useToast } from '@/contexts/ToastContext';
import { agentApplicationsApi, referrersApi } from '@/lib/api';

function AgentApplicationFormContent() {
  const searchParams = useSearchParams();
  const referrerCode = searchParams.get('ref');
  const toast = useToast();
  const { resolvedTheme, setTheme } = useTheme();

  const [currentStep, setCurrentStep] = useState(1);
  const [referrerId, setReferrerId] = useState<string | null>(null);
  
  // Personal Info
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Documents
  const [uploadedDocs, setUploadedDocs] = useState<{
    resume: File | null;
    validId: File | null;
    barangayClearance: File | null;
    gcashScreenshot: File | null;
  }>({
    resume: null,
    validId: null,
    barangayClearance: null,
    gcashScreenshot: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showGcashExample, setShowGcashExample] = useState(false);

  // Validate referrer code on mount
  useEffect(() => {
    const validateReferrer = async () => {
      if (referrerCode) {
        try {
          const referrer = await referrersApi.getByCode(referrerCode);
          setReferrerId(referrer.id);
        } catch (err) {
          console.error('Invalid referrer code:', err);
          toast.error('Invalid referral code');
        }
      }
    };
    validateReferrer();
  }, [referrerCode, toast]);

  const handleDocChange = (name: string, file: File | null) => {
    setUploadedDocs(prev => ({ ...prev, [name]: file }));
  };

  const validateName = (name: string, fieldName: string): string | undefined => {
    if (!name.trim()) return `${fieldName} is required`;
    if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`;
    if (!/^[a-zA-Z\s\u00C0-\u017F\u1E00-\u1EFF]+$/.test(name)) return `${fieldName} can only contain letters`;
    return undefined;
  };

  const validateBirthday = (date: string): string | undefined => {
    if (!date) return 'Birthday is required';
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (birthDate > today) return 'Birthday cannot be in the future';
    if (age < 18) return 'Must be 18 years or older';
    return undefined;
  };

  const validatePhoneNumber = (phone: string): string | undefined => {
    if (!phone.trim()) return 'Phone number is required';
    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!/^(09|\+639)\d{9}$/.test(cleanPhone)) return 'Please enter a valid number (e.g., 09123456789)';
    return undefined;
  };

  const validateEmail = (emailValue: string): string | undefined => {
    if (!emailValue.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) return 'Please enter a valid email address';
    return undefined;
  };

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    
    const firstNameError = validateName(firstName, 'First Name');
    const lastNameError = validateName(lastName, 'Last Name');
    const birthdayError = validateBirthday(birthday);
    const phoneError = validatePhoneNumber(phoneNumber);
    const emailError = validateEmail(email);
    
    if (firstNameError) errors.firstName = firstNameError;
    if (lastNameError) errors.lastName = lastNameError;
    if (birthdayError) errors.birthday = birthdayError;
    if (phoneError) errors.phoneNumber = phoneError;
    if (emailError) errors.email = emailError;
    if (!address.trim()) errors.address = 'Address is required';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    if (validationErrors.firstName) {
      const error = validateName(value, 'First Name');
      setValidationErrors(prev => ({ ...prev, firstName: error }));
    }
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
    if (validationErrors.lastName) {
      const error = validateName(value, 'Last Name');
      setValidationErrors(prev => ({ ...prev, lastName: error }));
    }
  };

  const handleBirthdayChange = (value: string) => {
    setBirthday(value);
    if (validationErrors.birthday) {
      const error = validateBirthday(value);
      setValidationErrors(prev => ({ ...prev, birthday: error }));
    }
  };

  const handlePhoneNumberChange = (value: string) => {
    // Only allow numbers
    const numbersOnly = value.replace(/\D/g, '');
    setPhoneNumber(numbersOnly);
    if (validationErrors.phoneNumber) {
      const error = validatePhoneNumber(numbersOnly);
      setValidationErrors(prev => ({ ...prev, phoneNumber: error }));
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (validationErrors.email) {
      const error = validateEmail(value);
      setValidationErrors(prev => ({ ...prev, email: error }));
    }
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    if (validationErrors.address) {
      const error = !value.trim() ? 'Address is required' : undefined;
      setValidationErrors(prev => ({ ...prev, address: error }));
    }
  };

  const handleSubmit = async () => {
    if (!uploadedDocs.resume || !uploadedDocs.validId || !uploadedDocs.gcashScreenshot) {
      toast.error('Please upload all required documents');
      return;
    }

    const loadingToast = toast.loading('Submitting your application...');
    setSubmitting(true);

    try {
      const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      };

      const docs = {
        resume: await fileToBase64(uploadedDocs.resume),
        validId: await fileToBase64(uploadedDocs.validId),
        barangayClearance: uploadedDocs.barangayClearance ? await fileToBase64(uploadedDocs.barangayClearance) : undefined,
        gcashScreenshot: await fileToBase64(uploadedDocs.gcashScreenshot),
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/agent-applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          birthday,
          contact_number: phoneNumber,
          email,
          address,
          resume: docs.resume,
          valid_id: docs.validId,
          barangay_clearance: docs.barangayClearance,
          gcash_screenshot: docs.gcashScreenshot,
          referred_by_referrer_id: referrerId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      toast.dismiss(loadingToast);
      toast.success('Application submitted successfully!');
      setSubmitSuccess(true);
    } catch (error) {
      console.error('Submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit application';
      toast.dismiss(loadingToast);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) {
        toast.error('Please check the form for errors');
        return;
      }
    }
    if (currentStep < 2) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Application Submitted!</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Thank you for applying to become an agent. We will review your application and contact you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-4 sm:py-12 px-3 sm:px-6 lg:px-8 relative transition-colors duration-300">
      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="fixed top-4 right-4 z-50 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-200 dark:border-gray-700"
      >
        {resolvedTheme === 'dark' ? (
          <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Progress Steps */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            {[1, 2].map((step) => (
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
                    {step === 1 && 'Personal Info'}
                    {step === 2 && 'Documents'}
                  </span>
                </div>
                {step < 2 && (
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
        <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300">
          {/* Header */}
          <div 
            className="relative px-4 sm:px-6 py-8 sm:py-12 text-white bg-cover bg-center"
            style={{
              backgroundImage: 'url(/banner.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-indigo-900/80 dark:from-blue-950/90 dark:to-indigo-950/90"></div>
            
            {/* Content */}
            <div className="relative z-10 flex items-center gap-4">
              <img 
                src="/cverge.png" 
                alt="Converge" 
                className="h-12 sm:h-16 w-auto drop-shadow-lg"
              />
              <img 
                src={resolvedTheme === 'dark' ? "/urbantelwhite.png" : "/urbantel.png"}
                alt="UrbanTel" 
                className="h-12 sm:h-16 w-auto drop-shadow-lg"
              />
              <div className="ml-2">
                <h1 className="text-2xl sm:text-3xl font-bold drop-shadow-lg">Agent Application</h1>
                <p className="mt-2 text-sm sm:text-base text-blue-100 drop-shadow-md">
                  {currentStep === 1 && 'Tell us about yourself'}
                  {currentStep === 2 && 'Upload required documents'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 min-h-[400px] sm:min-h-[500px] bg-white dark:bg-gray-800 transition-colors duration-300">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => handleFirstNameChange(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    className={`w-full px-4 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      validationErrors.firstName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter your first name"
                  />
                  {validationErrors.firstName && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    maxLength={100}
                    className="w-full px-4 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your middle name (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => handleLastNameChange(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    className={`w-full px-4 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      validationErrors.lastName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter your last name"
                  />
                  {validationErrors.lastName && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.lastName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Birthday <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => handleBirthdayChange(e.target.value)}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    min={new Date(new Date().getFullYear() - 120, 0, 1).toISOString().split('T')[0]}
                    className={`w-full px-4 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      validationErrors.birthday ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {validationErrors.birthday && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.birthday}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Must be 18 years or older</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneNumberChange(e.target.value)}
                    required
                    pattern="^(09|\+639)[0-9]{9}$"
                    maxLength={11}
                    className={`w-full px-4 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      validationErrors.phoneNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="09123456789"
                  />
                  {validationErrors.phoneNumber && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.phoneNumber}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">11 digits (e.g., 09123456789)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    required
                    maxLength={255}
                    className={`w-full px-4 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      validationErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="your.email@example.com"
                  />
                  {validationErrors.email && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    required
                    rows={3}
                    className={`w-full px-4 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                      validationErrors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter your complete address"
                  />
                  {validationErrors.address && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {validationErrors.address}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Documents */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resume (PDF or DOCX) <span className="text-red-500">*</span>
                  </label>
                  <ImageUpload
                    name="resume"
                    label="Upload Resume"
                    onImageChange={handleDocChange}
                    accept=".pdf,.doc,.docx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Valid ID with 3 Signatures <span className="text-red-500">*</span>
                  </label>
                  <ImageUpload
                    name="validId"
                    label="Upload Valid ID"
                    onImageChange={handleDocChange}
                    accept="image/*"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Barangay Clearance (Optional)
                  </label>
                  <ImageUpload
                    name="barangayClearance"
                    label="Upload Barangay Clearance"
                    onImageChange={handleDocChange}
                    accept="image/*"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    GCash Verified Screenshot <span className="text-red-500">*</span>
                  </label>
                  <ImageUpload
                    name="gcashScreenshot"
                    label="Upload GCash Screenshot"
                    onImageChange={handleDocChange}
                    accept="image/*"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGcashExample(true)}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                  >
                    View example of GCash verified screenshot
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="px-4 sm:px-6 lg:px-8 py-4 bg-gray-50 dark:bg-gray-700 flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentStep < 2 ? (
              <button
                onClick={nextStep}
                className="px-6 py-3 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !uploadedDocs.resume || !uploadedDocs.validId || !uploadedDocs.gcashScreenshot}
                className="px-6 py-3 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* GCash Example Modal */}
      {showGcashExample && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowGcashExample(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                GCash Verified Screenshot Example
              </h3>
              <button
                onClick={() => setShowGcashExample(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0 ml-2"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center mb-3">
              <img 
                src="/gcash sample.png" 
                alt="GCash Verified Example" 
                className="w-full h-auto rounded border border-gray-300 dark:border-gray-600"
                style={{ maxHeight: 'calc(90vh - 150px)' }}
              />
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center">
              Your screenshot should show your verified GCash account similar to this example.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentApplicationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AgentApplicationFormContent />
    </Suspense>
  );
}
