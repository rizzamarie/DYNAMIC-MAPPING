import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import './App.css';

function App() {
  return (
    <div className="App">
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md={8} className="text-center">
            <Card>
              <Card.Header as="h5">Kiosk System</Card.Header>
              <Card.Body>
                <Card.Title>Welcome to the Kiosk</Card.Title>
                <Card.Text>
                  This system is now using Bootstrap for UI/UX.
                </Card.Text>
                <Button variant="primary">Get Started</Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;
