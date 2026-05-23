import React from 'react';
import { render, screen } from '@testing-library/react';
import HostSitesTab from './HostSitesTab';

test('renders Host Sites Tab', () => {
    render(<HostSitesTab />);
    const heading = screen.getByRole('button', { name: /Refresh/i });
    expect(heading).toBeInTheDocument();
});