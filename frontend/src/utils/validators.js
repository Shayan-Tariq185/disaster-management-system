export const required = (label = 'Field') => ({
    required: `${label} is required`,
});

export const emailRule = {
    required: 'Email is required',
    pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address' },
};

export const passwordRule = {
    required: 'Password is required',
    minLength: { value: 6, message: 'Minimum 6 characters' },
};

export const positiveNumber = (label = 'Value') => ({
    required: `${label} is required`,
    min: { value: 1, message: `${label} must be greater than 0` },
    valueAsNumber: true,
});