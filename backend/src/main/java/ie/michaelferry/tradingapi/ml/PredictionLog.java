package ie.michaelferry.tradingapi.ml;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "prediction_logs")
public class PredictionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    private String symbol;

    @Column(nullable = false, length = 80)
    private String model;

    @Column(nullable = false)
    private double predictedPrice;

    @Column(nullable = false)
    private double currentPrice;

    private Double confidence;

    @Column(length = 12)
    private String direction;

    @Column(nullable = false)
    private int horizonHours;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant evaluatedAt;

    private Double actualPrice;

    private Double absoluteError;

    private Double percentError;

    private Boolean hit;

    public Long getId() {
        return id;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public double getPredictedPrice() {
        return predictedPrice;
    }

    public void setPredictedPrice(double predictedPrice) {
        this.predictedPrice = predictedPrice;
    }

    public double getCurrentPrice() {
        return currentPrice;
    }

    public void setCurrentPrice(double currentPrice) {
        this.currentPrice = currentPrice;
    }

    public Double getConfidence() {
        return confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public int getHorizonHours() {
        return horizonHours;
    }

    public void setHorizonHours(int horizonHours) {
        this.horizonHours = horizonHours;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getEvaluatedAt() {
        return evaluatedAt;
    }

    public void setEvaluatedAt(Instant evaluatedAt) {
        this.evaluatedAt = evaluatedAt;
    }

    public Double getActualPrice() {
        return actualPrice;
    }

    public void setActualPrice(Double actualPrice) {
        this.actualPrice = actualPrice;
    }

    public Double getAbsoluteError() {
        return absoluteError;
    }

    public void setAbsoluteError(Double absoluteError) {
        this.absoluteError = absoluteError;
    }

    public Double getPercentError() {
        return percentError;
    }

    public void setPercentError(Double percentError) {
        this.percentError = percentError;
    }

    public Boolean getHit() {
        return hit;
    }

    public void setHit(Boolean hit) {
        this.hit = hit;
    }
}
