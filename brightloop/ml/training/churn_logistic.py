import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import joblib

def train_churn_baseline():
    """Trains a statistical logistic regression model for churn prediction."""
    # In production, this DataFrame is populated via pd.read_sql from PostgreSQL
    data = pd.DataFrame({
        'tenure_months': [1, 12, 3, 24, 5, 1],
        'failed_payments': [0, 0, 1, 0, 3, 2],
        'discount_usage': [1, 0, 1, 0, 1, 0],
        'churned_next_month': [0, 0, 0, 0, 1, 1] # Target
    })
    
    X = data[['tenure_months', 'failed_payments', 'discount_usage']]
    y = data['churned_next_month']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = LogisticRegression()
    model.fit(X_train, y_train)
    
    # Save the statistical baseline artifact
    joblib.dump(model, '../public/models/churn_logistic_v1.pkl')
    print("Statistical churn model trained and exported.")

if __name__ == "__main__":
    train_churn_baseline()