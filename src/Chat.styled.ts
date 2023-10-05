import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const MessagesHistory = styled.div`
  flex: 1;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const Message = styled.div`
  background: #eee;
  border-radius: 10px;
  padding: 10px;
  margin: 10px;
  max-width: 50%;
`;
