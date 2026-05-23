import React from 'react';
import { render, screen } from '@testing-library/react';
import APITesterTab from './APITesterTab';

test('renders API Tester Tab', () => {
    render(<APITesterTab />);
    const linkElement = screen.getByText(/API Tester/i);
    expect(linkElement).toBeInTheDocument();
});