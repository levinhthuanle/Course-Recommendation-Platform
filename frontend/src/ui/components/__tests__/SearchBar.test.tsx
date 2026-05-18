import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SearchBar } from '../SearchBar'

describe('SearchBar', () => {
  it('renders input and button with placeholder', () => {
    const onChange = () => {}
    const onSearch = () => {}
    render(<SearchBar value="" onChange={onChange} onSearch={onSearch} />)
    const input = screen.getByPlaceholderText('Search courses...')
    expect(input).toBeTruthy()
    const button = screen.getByText('Search')
    expect(button).toBeTruthy()
  })
})
