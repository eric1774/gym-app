import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InlineNoteEditor } from '../InlineNoteEditor';

describe('InlineNoteEditor', () => {
  it('renders the note text in view mode', () => {
    const { getByText } = render(
      <InlineNoteEditor value="85-90% of Best" onCommit={jest.fn()} />,
    );
    expect(getByText('85-90% of Best')).toBeTruthy();
  });

  it('shows placeholder when value and hint are empty', () => {
    const { getByText } = render(<InlineNoteEditor value="" onCommit={jest.fn()} />);
    expect(getByText('Add a note…')).toBeTruthy();
  });

  it('shows hint when value is empty and hint is provided', () => {
    const { getByText } = render(
      <InlineNoteEditor value="" hint="felt heavy last time" onCommit={jest.fn()} />,
    );
    expect(getByText('felt heavy last time')).toBeTruthy();
  });

  it('calls onCommit with the text when submit fires', () => {
    const onCommit = jest.fn();
    const { getByText, getByTestId } = render(
      <InlineNoteEditor value="original" onCommit={onCommit} />,
    );
    fireEvent.press(getByText('original'));
    const input = getByTestId('inline-note-input');
    fireEvent.changeText(input, 'updated');
    fireEvent(input, 'submitEditing');
    expect(onCommit).toHaveBeenCalledWith('updated');
  });

  it('commits on blur', () => {
    const onCommit = jest.fn();
    const { getByText, getByTestId } = render(
      <InlineNoteEditor value="original" onCommit={onCommit} />,
    );
    fireEvent.press(getByText('original'));
    const input = getByTestId('inline-note-input');
    fireEvent.changeText(input, 'blurred text');
    fireEvent(input, 'blur');
    expect(onCommit).toHaveBeenCalledWith('blurred text');
  });
});
