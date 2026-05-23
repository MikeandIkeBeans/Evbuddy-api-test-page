import React from 'react';
import { render, screen } from '@testing-library/react';
import LiveChargersTab from './LiveChargersTab';

test('renders LiveChargersTab component', () => {
    render(<LiveChargersTab />);
    const linkElement = screen.getByText(/Live Charge Points/i);
    expect(linkElement).toBeInTheDocument();
});