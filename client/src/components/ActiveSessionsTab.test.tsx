import React from 'react';
import { render, screen } from '@testing-library/react';
import ActiveSessionsTab from './ActiveSessionsTab';

test('renders Active Sessions Tab', () => {
    render(<ActiveSessionsTab />);
    const linkElement = screen.getByText(/Active Charging Sessions/i);
    expect(linkElement).toBeInTheDocument();
});