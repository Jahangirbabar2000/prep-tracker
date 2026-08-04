# Deep Learning — Full Exam Deck (Curated + Book Augmentation)

165 curated cards + 38 book-augmentation cards, grouped under the 8 course topics. Curated cards first; each topic then has a "— From the books —" section with page-cited augmentation cards.

**TOTAL: 203 cards** (165 curated + 38 augmentation).

---

## 1. Math & Information Theory

**Q:** State the nested (set-containment) relationship between Machine Learning, Neural Networks, and Deep Learning.
**A:** Deep Learning ⊂ Neural Networks ⊂ Machine Learning. The slides also assert **"Deep Learning = deep neural networks"** and, at present, **"Deep Learning *is* AI."**

**Q:** Define **supervised learning** and its supervision mechanism.
**A:** Learning from **annotated/labeled data** — examples of inputs and their desired outputs. The learning algorithm adjusts the model to lower the **degree of dissimilarity** between model output and desired output, based on a **supervision signal**.

**Q:** Contrast the three decision-boundary regimes in the classical bias–variance view.
**A:** **Too simple** boundary → inadequate for true data behavior → **bias**. **Balanced** boundary → good **generalization** to unseen data. **Too complex** boundary → over-emphasizes data idiosyncrasies (noise) → **variance**. The slides note this is the *classical* (incomplete) view, to be revised later.

**Q:** When is a square matrix invertible? (three equivalent conditions)
**A:** Iff its **determinant is non-zero**; iff its **columns are linearly independent**; iff its **rows are linearly independent**. It cannot be inverted if it has redundant (linearly dependent) rows/columns — i.e., **low rank**.

**Q:** Define eigenvalues/eigenvectors and how to find them.
**A:** An eigenvector $x$ of $A$ satisfies $Ax = \lambda x$ (x stays on the same line as $Ax$); scalar $\lambda$ is the eigenvalue. $\lambda$ is an eigenvalue iff $(A - \lambda I)$ is singular, i.e., solve the **characteristic polynomial** $\det(A - \lambda I) = 0$ (n solutions for $n\times n$). For each $\lambda$, find eigenvectors by solving $(A - \lambda I)x = 0$.

**Q:** State the three Kolmogorov axioms of probability.
**A:** (1) **Non-negativity**: $P(A) \ge 0$. (2) **Normalization**: $P(\Omega) = 1$. (3) **Countable additivity** (σ-additivity): for mutually exclusive $A_1, A_2, \dots$, $P(\bigcup_{i=1}^{\infty} A_i) = \sum_{i=1}^{\infty} P(A_i)$. Derivable: $P(\emptyset)=0$, $P(A^c)=1-P(A)$, and monotonicity $A\subseteq B \Rightarrow P(A)\le P(B)$.

**Q:** Give the sum rule and product rule of probability.
**A:** **Sum rule** (marginalization): $p(X) = \sum_Y p(X, Y)$. **Product rule**: $p(X, Y) = p(Y|X)\,p(X)$.

**Q:** State Bayes' theorem and identify likelihood, prior, and posterior.
**A:** $p(Y|X) = \dfrac{p(X|Y)\,p(Y)}{p(X)}$, with $p(X) = \sum_Y p(X|Y)p(Y)$. Here $p(X|Y)$ = **likelihood**, $p(Y)$ = **prior**, $p(Y|X)$ = **posterior**. In words: **posterior ∝ likelihood × prior**.

**Q:** Give the definition of expectation (discrete and continuous) and its linearity.
**A:** Discrete: $\mathbb{E}[f] = \sum_x p(x) f(x)$. Continuous: $\mathbb{E}[f] = \int p(x) f(x)\,dx$. Approximation from samples: $\mathbb{E}[f] \approx \frac{1}{N}\sum_{n=1}^{N} f(x_n)$. **Linearity**: $\mathbb{E}[\alpha f(x) + \beta g(x)] = \alpha \mathbb{E}[f] + \beta \mathbb{E}[g]$.

**Q:** Give the computational formulas for variance and covariance.
**A:** $\text{var}[f] = \mathbb{E}[(f(x) - \mathbb{E}[f(x)])^2] = \mathbb{E}[f(x)^2] - \mathbb{E}[f(x)]^2$. $\text{cov}[x,y] = \mathbb{E}[xy] - \mathbb{E}[x]\mathbb{E}[y]$.

**Q:** Does zero correlation imply independence? What about the converse?
**A:** If $X, Y$ are **independent** then $\text{Corr}(X,Y) = 0$. But $\text{Corr}(X,Y) = 0$ does **NOT** imply independence (e.g., structured nonlinear scatter patterns can have zero correlation).

**Q:** Write the univariate Gaussian pdf and identify its parameters.
**A:** $\mathcal{N}(x|\mu, \sigma^2) = \dfrac{1}{(2\pi\sigma^2)^{1/2}} \exp\left\{-\dfrac{1}{2\sigma^2}(x-\mu)^2\right\}$, with **mean** $\mu$ and **variance** $\sigma^2$. For it, $\mathbb{E}[x] = \mu$, $\mathbb{E}[x^2] = \mu^2 + \sigma^2$, $\text{var}[x] = \sigma^2$.

**Q:** Write the multivariate Gaussian pdf.
**A:** $\mathcal{N}(x|\mu, \Sigma) = \dfrac{1}{(2\pi)^{D/2}} \dfrac{1}{|\Sigma|^{1/2}} \exp\left\{-\dfrac{1}{2}(x-\mu)^T \Sigma^{-1} (x-\mu)\right\}$, where $\mu$ = mean vector, $\Sigma$ = covariance matrix, $D$ = space dimensionality.

**Q:** State the Central Limit Theorem as presented.
**A:** The **sum of $N$ random variables** becomes increasingly **Gaussian** as $N$ increases (under mild conditions) — e.g., summing uniform [0,1] variables approaches a Gaussian shape as $N$ grows.

**Q:** Give the formula for the **information content (self-information)** of observing $X=x$, and explain the intuition and the minus sign.
**A:** $h(x)=-\log_2 p(x)$. Intuition: a **highly improbable** event carries more information (surprise); a **certain** event ($p=1$) carries none. The **minus sign** ensures $h$ is positive or zero. Derived from requiring $h(x,y)=h(x)+h(y)$ for independent events where $p(x,y)=p(x)p(y)$, which forces a log form.

**Q:** Define **Shannon entropy** $H[x]$ and what it measures.
**A:** $H[x]=-\sum_x p(x)\log_2 p(x)=\mathbb{E}_{x\sim P}[I(x)]$ — the **expected** (average) information content. It is a lower bound on the average number of bits (if $\log_2$) needed to encode symbols drawn from $P$. Convention: $p(x)\ln p(x)=0$ when $p(x)=0$ since $\lim_{p\to 0}p\ln p=0$.

**Q:** For a **binary** random variable with $p(x=1)=p$, when is entropy **maximal** vs. near zero?
**A:** Entropy is **maximal at $p=0.5$** (distribution is uniform, most uncertain). It approaches **zero** when $p$ is near 0 or near 1 (distribution nearly deterministic). Formula shown: $(p-1)\log(1-p)-p\log p$.

**Q:** State the **Noiseless Coding Theorem** (Shannon, 1948).
**A:** **Entropy is a lower bound on the number of bits needed to transmit the state of a random variable** — you cannot encode symbols from distribution $P$ using fewer bits on average than $H$.

**Q:** Define the **Kullback-Leibler (KL) divergence** and its interpretation.
**A:** $KL(p\|q)=-\int p(x)\ln\frac{q(x)}{p(x)}\,dx$. It is the **relative entropy** / average **extra** information needed to specify $x$ when using an (approximating) coding scheme based on $q$ instead of the true $p$.

**Q:** State the key **properties of KL divergence** (sign, zero condition, symmetry).
**A:** **Non-negative**: $KL(p\|q)\ge 0$. **Zero iff** $P=Q$ (for discrete; for continuous, equal almost everywhere). It measures the difference between distributions but is **not a true distance** because it is **not symmetric**: $KL(P\|Q)\ne KL(Q\|P)$.

**Q:** How does the **asymmetry** of KL divergence affect approximating a bimodal $p(x)$ by a single-mode $q$?
**A:** Minimizing $KL(p\|q)$ makes $q$ put mass on **all modes** — it **blurs the modes together** (mode-averaging). Minimizing $KL(q\|p)$ makes $q$ **avoid low-probability regions** between modes — it picks/locks onto a **single mode** (mode-seeking).

**Q:** Define **cross-entropy** $H(P,Q)$ and relate it to KL divergence.
**A:** $H(P,Q)=-\mathbb{E}_{x\sim P}\log Q(x)=-\int p(x)\ln q(x)\,dx$. Relation: $H(P,Q)=H(P)+KL(P\|Q)$. Since $H(P)$ doesn't depend on $Q$, **minimizing cross-entropy w.r.t. $Q$ is equivalent to minimizing KL divergence**.

**Q:** In what broad sense is any negative-log-likelihood loss a "cross-entropy," and what example is given?
**A:** Broadly, cross-entropy is the cross-entropy between the **empirical distribution** (training data) and the model — **any loss consisting of negative log-likelihood**. Example: **MSE is the cross-entropy between the empirical distribution and a Gaussian model**. Thus maximum likelihood = making the model distribution match $\hat{p}_{\text{data}}$.

**Q:** Define **mutual information** $I[x,y]$ and its key properties.
**A:** $I[x,y]\equiv KL(p(x,y)\|p(x)p(y))=-\iint p(x,y)\ln\frac{p(x)p(y)}{p(x,y)}\,dx\,dy$ — the KL divergence between the joint and the product of marginals (quantifies degree of dependence). Properties: $I[x,y]\ge 0$, with $I[x,y]=0$ **iff $x$ and $y$ are independent**. Also $I[x,y]=H[x]-H[x\mid y]=H[y]-H[y\mid x]$.

### — From the books —

**Q:** State the **Singular Value Decomposition (SVD)** of a real $m\times n$ matrix and how its factors relate to eigendecomposition.
**A:** $A = U D V^\top$, with $U$ ($m\times m$) and $V$ ($n\times n$) **orthogonal**, $D$ ($m\times n$) **diagonal** holding the **singular values**. Columns of $U$ = eigenvectors of $AA^\top$; columns of $V$ = eigenvectors of $A^\top A$; nonzero singular values are the **square roots of the eigenvalues** of $A^\top A$. Unlike eigendecomposition, **every** real matrix has an SVD. *[Goodfellow p.44]*

**Q:** Define the **Moore–Penrose pseudoinverse** and the solution it gives for $Ax=y$.
**A:** $A^+ = V D^+ U^\top$ (reciprocate the nonzero singular values, then transpose). If $A$ has **more columns than rows**, $x=A^+y$ is the solution of minimal $\lVert x\rVert_2$; if **more rows than columns**, it gives the least-squares $x$ minimizing $\lVert Ax-y\rVert_2$. *[Goodfellow p.45–46]*

**Q:** Give the eigendecomposition of a **real symmetric** matrix and the eigenvalue conditions for **positive/negative (semi)definiteness**.
**A:** $A = Q\Lambda Q^\top$ with $Q$ orthogonal (eigenvectors), $\Lambda$ diagonal (real eigenvalues). All $\lambda_i>0$ → **positive definite**; all $\lambda_i\ge 0$ → **positive semidefinite** ($x^\top A x\ge 0$); all $\lambda_i<0$ (resp. $\le 0$) → negative (semi)definite. $A$ is **singular iff any $\lambda_i=0$**. *[Goodfellow p.42–43]*

**Q:** Which continuous distribution **maximizes differential entropy** for fixed mean and variance, and what is its entropy?
**A:** The **Gaussian**, via Lagrange multipliers on the normalization + fixed-mean + fixed-variance constraints. Its differential entropy is $H[x] = \tfrac{1}{2}\{1 + \ln(2\pi\sigma^2)\}$, which **grows with $\sigma^2$** and can be **negative** for $\sigma^2 < 1/(2\pi e)$. *[Bishop p.51]*

**Q:** State **Jensen's inequality** and use it to prove $\mathrm{KL}(p\|q)\ge 0$.
**A:** For convex $f$: $f(\mathbb{E}[x]) \le \mathbb{E}[f(x)]$. Applying it with the convex $f=-\ln$: $\mathrm{KL}(p\|q) = -\int p(\mathbf{x})\ln\{q(\mathbf{x})/p(\mathbf{x})\}\,d\mathbf{x} \ge -\ln\!\int q(\mathbf{x})\,d\mathbf{x} = 0$, with equality iff $q=p$. *[Bishop p.52–53]*

---

## 2. Supervised Learning & Regularization

**Q:** Write the linear-regression hypothesis for a single input, and identify what is learned.
**A:** $h_w(x) = w_0 + w_1 x$, with parameters $w_i$ (learned). $w_0$ is the intercept/bias, $w_1$ the slope. Learning finds the "best" parameter values.

**Q:** Write the least-squares error (cost) function for linear regression and the objective.
**A:** $E(w_0, w_1) = \dfrac{1}{2N} \sum_{i=1}^{N} (h_w(x_i) - t_i)^2$ — the mean of squared errors between **actual** $h_w(x_i)$ and **desired** $t_i$. Objective: $\min_{w_0, w_1} E(w_0, w_1)$.

**Q:** State the gradient-descent update rule and its components.
**A:** Initialize $w$; repeat until converged: $w := w - \alpha \dfrac{\partial E(w)}{\partial w}$, simultaneously for all components $w_j$. $\alpha$ is the learning rate (step size); the update moves "downhill" on the error surface. (Idea from A. Cauchy, 1847.)

**Q:** Derive the single-exemplar gradient of the least-squares error w.r.t. $w_j$.
**A:** For $\frac{1}{2}(h_w(x)-t)^2$: $\dfrac{\partial E}{\partial w_j} = (h_w(x) - t)\,\dfrac{\partial}{\partial w_j}\left(\sum_{i=0}^n w_i x_i - t\right) = (h_w(x) - t)\,x_j$.

**Q:** For $N$ i.i.d. observations $D=\{x_1,\dots,x_N\}$ with $X\sim p(X\mid w)$, write the **likelihood** and the **maximum-likelihood** estimator.
**A:** Likelihood: $\text{Likelihood}(D)=\prod_{i=1}^{N} p(x_i\mid w)$. Estimator: $w_{ML}=\arg\max_w \prod_i p(x_i\mid w)=\arg\max_w \sum_{i=1}^{N}\log p(X_i\mid w)$ (the **log-likelihood**).

**Q:** In maximum likelihood, why transition from the product form to the **log domain**?
**A:** The product $\prod_i p_{\text{model}}(x^{(i)};\theta)$ is **prone to underflows**. Taking the log turns it into a sum $\sum_i \log p_{\text{model}}(x^{(i)};\theta)$, which is numerically stable and has the same argmax (log is monotonic).

**Q:** Why is maximizing the Gaussian likelihood equivalent to minimizing the **sum-of-squares error (SSE)**?
**A:** The $\frac{N}{2}\ln\beta$ and $-\frac{N}{2}\ln(2\pi)$ terms don't depend on $\mathbf{w}$ so can be dropped. Rescaling the remaining term by $-1/\beta$ (a negative factor, so argmax becomes argmin) gives $\arg\min_\mathbf{w}\frac{1}{2}\sum_{n=1}^{N}\{y(x_n,\mathbf{w})-t_n\}^2$ = SSE. Thus $\mathbf{w}_{ML}=\arg\max p(\mathbf{t}\mid\dots)=\arg\min\text{SSE}$. This is the "**Least Squares method**."

**Q:** How can a **linear** regression model represent a **nonlinear** function of the input while remaining "linear"?
**A:** Use basis functions (features): $y(\mathbf{x},\mathbf{w})=w_0+\sum_{j=1}^{M-1}w_j\phi_j(\mathbf{x})=\mathbf{w}^T\boldsymbol{\phi}(\mathbf{x})$. It is nonlinear in input $\mathbf{x}$ but **linear in the parameters $\mathbf{w}$** — hence still a "linear model." E.g. $y=w_0+w_1(\text{input})+w_2(\text{input})^2+\dots$

**Q:** State the **Normal Equations** closed-form solution for linear-regression weights.
**A:** $\mathbf{w}=\left(X^{(train)\top}X^{(train)}\right)^{-1}X^{(train)\top}\mathbf{y}^{(train)}$, i.e. $\Theta=(X^TX)^{-1}X^Ty$. Derived from $\nabla_\mathbf{w}\text{MSE}_{train}=0$.

**Q:** Compare **Gradient Descent** vs. **Normal Equations** for linear regression on four criteria.
**A:** Need to select learning rate: GD **yes**, NE **no**. Need to iterate: GD **yes**, NE **no**. Need matrix inversion: GD **no**, NE **yes**. Speed issue for large number of features: GD **no**, NE **yes** (inverting $X^TX$ is costly). Note: no closed-form solution exists for neural networks.

**Q:** Write the logistic-regression hypothesis and the sigmoid (logistic) function.
**A:** $h_\theta(x)=g(\theta^Tx)=\frac{1}{1+\exp(-\theta^Tx)}$, where $g(a)=\frac{1}{1+\exp(-a)}$ is the **sigmoid**, mapping any real $\theta^Tx$ into $(0,1)$. Also $p(y=1\mid x)=\frac{1}{1+\exp(-\theta^Tx)}$ and $0\le h_\theta(x)\le 1$.

**Q:** Why is **least squares problematic for classification** compared to logistic regression?
**A:** Least squares is **highly sensitive to outliers** (non-robust) — adding a few extreme points shifts the decision boundary badly, unlike logistic regression. It also gives **poor results on simple multi-class problems**.

**Q:** State the logistic-regression cost (error/loss) function $J(\theta)$ and its objective.
**A:** $J(\theta)=-\frac{1}{m}\sum_{i=1}^{m}\left\{y^{(i)}\ln h_\theta(x^{(i)})+(1-y^{(i)})\ln(1-h_\theta(x^{(i)}))\right\}$. This is the **cross-entropy** loss. Objective: $\arg\min_\theta J(\theta)$. It can be derived via maximum likelihood.

**Q:** Write the explicit gradient-descent update for logistic regression.
**A:** $\theta_j:=\theta_j-\alpha\sum_{i=1}^{m}\left(h_\theta(x^{(i)})-y^{(i)}\right)x_j^{(i)}$, simultaneously for all $\theta_j$. (Note: same form as the linear-regression update, but $h_\theta$ is now the sigmoid.)

**Q:** How can logistic regression produce a **nonlinear decision boundary**? Give an example.
**A:** Include nonlinear feature terms. Linear: $h_\theta(x)=g(\theta_0+\theta_1x_1+\theta_2x_2)$, predict $y=1$ if e.g. $-3+x_1+x_2\ge 0$. Nonlinear: $h_\theta(x)=g(\theta_0+\theta_1x_1+\theta_2x_2+\theta_3x_1^2+\theta_4x_2^2)$, predict $y=1$ if e.g. $-1+x_1^2+x_2^2\ge 0$ (a circular boundary).

**Q:** Describe the **generative** approach to classification.
**A:** First solve the inference problem of determining **class-conditional densities** $p(x\mid C_k)$ for each class individually; separately infer **class priors** $p(C_k)$; then use **Bayes' theorem** to find class posteriors $p(C_k\mid x)=\frac{p(x\mid C_k)p(C_k)}{p(x)}$, with $p(x)=\sum_k p(x\mid C_k)p(C_k)$. Can sample from the distributions.

**Q:** Describe the **discriminative** approach to classification.
**A:** First determine posterior class probabilities $p(C_k\mid x)$ directly, then use decision theory to assign each $x$ to a class. (Or find a **discriminant function** $f(x)$ that maps input directly to a label, where probabilities play no role.) Determines the decision boundary directly — **no burden of modeling full distributions**, but **cannot sample** from them.

**Q:** For a 2-class problem, show how the posterior $p(C_1\mid x)$ becomes a sigmoid, and define the log-odds.
**A:** $p(C_1\mid x)=\frac{p(x\mid C_1)p(C_1)}{p(x\mid C_1)p(C_1)+p(x\mid C_2)p(C_2)}=\frac{1}{1+\exp(-a)}=\sigma(a)$, where the **log-odds** $a=\ln\frac{p(x\mid C_1)p(C_1)}{p(x\mid C_2)p(C_2)}$. Decision: $a\ge 0\Leftrightarrow\sigma(a)\ge 0.5\Leftrightarrow p(C_1\mid x)\ge p(C_2\mid x)$.

**Q:** What two key assumptions define **Linear Discriminant Analysis (LDA)**?
**A:** (1) Each class-conditional density $p(x\mid C_k)$ is **Gaussian**: $f_k(x)=\frac{1}{(2\pi)^{p/2}|\Sigma_k|^{1/2}}e^{-\frac{1}{2}(x-\mu_k)^T\Sigma_k^{-1}(x-\mu_k)}$. (2) **Equal covariances** across classes: $\forall k:\Sigma_k=\Sigma$. Under these assumptions the problem becomes **linear**.

**Q:** What happens to LDA's decision boundaries when class **covariances are not equal**?
**A:** The decision boundaries (hypersurfaces) are **no longer linear** — they become curved/quadratic.

**Q:** Define underfitting vs. overfitting in terms of model/representational capacity (polynomial order M).
**A:** **Underfitting** = capacity too low (M too low, e.g. M=0 or M=1); model too limited to capture the pattern. **Overfitting** = capacity too high (M too high, e.g. M=9); fits training points but generalizes poorly. Overfitting gives **better results on the training set but poor generalization**.

**Q:** State the No Free Lunch Theorem (NFLT, Wolpert 1996) and its practical implication.
**A:** Averaged over **all possible data distributions**, every algorithm has the **same error rate on previously unseen data** — there is **no universally "best" algorithm**; performance is task-dependent. Implication: it serves as a **motivation for regularization**.

**Q:** Write the general regularized risk functional and name each term.
**A:** **R_reg[f] := R_emp[f] + λ·Ω[f]**. Here **R_emp** is the empirical risk (risk functional), **λ > 0** is the **regularization hyperparameter**, and **Ω** is the **regularizer (regularization term)**. It trades off minimizing empirical risk against model simplicity (small Ω).

**Q:** What is the weight decay regularizer, and what does it penalize?
**A:** **Ω[f] = wᵀw = ‖w‖₂² = ‖w‖²** — the squared L² norm of the weights. It **penalizes large weight values**. In linear regression the objective becomes **J(w) = RMSE_train + λ·wᵀw**.

**Q:** How does the L2-regularized gradient-descent weight update differ from the unregularized one (linear regression)?
**A:** Unregularized: θⱼ := θⱼ − α (1/m) Σ (h_θ(x⁽ⁱ⁾) − y⁽ⁱ⁾) xⱼ⁽ⁱ⁾. Regularized adds weight shrinkage: **θⱼ := θⱼ(1 − α·λ/m) − α (1/m) Σ (h_θ(x⁽ⁱ⁾) − y⁽ⁱ⁾) xⱼ⁽ⁱ⁾**. The factor **(1 − αλ/m) < 1** shrinks the weight each step.

**Q:** Contrast the classical vs. modern view of model capacity and overfitting.
**A:** **Classical view:** test risk is U-shaped — there is a "sweet spot"; beyond the interpolation threshold, overfitting hurts. **Modern view:** past the interpolation threshold test risk **descends again** — the **double descent curve** — so very large **overparameterized** models can exhibit **benign overfitting** and generalize exceedingly well. Traditional model sizing may actually be underparameterization; the phenomenon is not limited to neural networks.

### — From the books —

**Q:** State the full **bias–variance decomposition** of the expected squared loss.
**A:** $\text{expected loss} = (\text{bias})^2 + \text{variance} + \text{noise}$, with $(\text{bias})^2 = \int\{\mathbb{E}_\mathcal{D}[f(\mathbf{x};\mathcal{D})] - h(\mathbf{x})\}^2 p(\mathbf{x})\,d\mathbf{x}$, $\text{variance} = \int \mathbb{E}_\mathcal{D}[\{f - \mathbb{E}_\mathcal{D}[f]\}^2]\,p(\mathbf{x})\,d\mathbf{x}$, $\text{noise} = \iint\{h(\mathbf{x})-t\}^2 p(\mathbf{x},t)$, where $h(\mathbf{x})=\mathbb{E}[t\mid\mathbf{x}]$. Flexible → low bias/high variance; rigid → high bias/low variance. *[Bishop p.125]*

**Q:** Under squared loss (and the Minkowski loss $|f-t|^q$), what is the optimal prediction $f^\star(\mathbf{x})$?
**A:** Squared loss ($q=2$) → the **conditional mean** $f^\star(\mathbf{x})=\mathbb{E}_t[t\mid\mathbf{x}]$ (the regression function). $q=1$ → conditional **median**; $q\to 0$ → conditional **mode**. *[Bishop p.121–122]*

**Q:** State **MAP estimation** and show that an L2 penalty corresponds to a Gaussian prior.
**A:** $\theta_{MAP}=\arg\max_\theta[\log p(x\mid\theta)+\log p(\theta)]$. With a Gaussian prior $\mathcal N(w;0,\tfrac{1}{\lambda}I)$, the log-prior is $\propto \lambda w^\top w$ — i.e. **weight decay**. So MAP with a Gaussian prior **= L2 regularization** (reduces variance at the cost of bias). *[Goodfellow p.138–139]*

**Q:** Compare **L2 vs L1 regularization** $\Omega(\mathbf{w})=\tfrac{\lambda}{2}\sum_j|w_j|^q$ — which gives sparsity and why?
**A:** $q=2$ (weight decay) shrinks all weights, none exactly zero. $q=1$ (**lasso**) drives some $w_j$ **exactly to zero** → sparse model. Geometrically, minimizing subject to $\sum_j|w_j|^q\le\eta$: the L1 region has **corners on the axes**, so the optimum tends to land at a corner ($w_j=0$). *[Bishop p.264–266]*

**Q:** Why is **early stopping** approximately equivalent to L2 weight decay?
**A:** On a quadratic error surface, starting at the origin and following the negative gradient moves first along **low-curvature (small-eigenvalue)** directions. Stopping early leaves those directions near zero — the same shrinkage weight decay applies. Quantitatively $\tau\eta$ (iterations × learning rate) acts like $1/\lambda$. *[Bishop p.266–267]*

**Q:** Explain **dropout as an approximation to bagging** and the **weight-scaling inference rule**.
**A:** Dropout trains the ensemble of sub-networks formed by zeroing random subsets of units (typical keep-prob **0.8 input, 0.5 hidden**); unlike bagging the sub-models **share parameters**. At test time, instead of averaging exponentially many masks, run one forward pass with each unit's outgoing weights **multiplied by its keep-probability** (keep-prob ½ ⇒ **divide weights by 2**). Exact for models without nonlinear hidden units. *[Goodfellow p.258–264]*

---

## 3. Neural Network Fundamentals

**Q:** What are the three defining components of an Artificial Neural Network (ANN)?
**A:** (1) **Units** (also called nodes or "neurons"), each with an associated function; (2) **Connections** — weighted links between units; (3) a **Learning algorithm** that typically modifies connection weights (and sometimes the units or network topology). Note: conventional ANNs are **NOT models of biological brains**.

**Q:** Distinguish layered, feedforward, and fully/arbitrarily connected ANN topologies.
**A:** **Fully/arbitrarily connected** = most general; any unit may connect to any unit. **Layered** = units grouped into layers; may include retrograde connections (within layers or to previous layers). **Feedforward** = layered with **only forward connections** (input→output, layer i to layer i+1), no cycles.

**Q:** What defines a "shallow" vs. a "deep" feedforward network?
**A:** Both have input, hidden, and output layers. **Shallow** = exactly **one hidden layer**; **Deep** = **more than one hidden layer**.

**Q:** What are the key properties of the McCulloch-Pitts neuron model?
**A:** It is **simple**, **computationally efficient**, and has **no neurobiological plausibility**. Structurally it computes a weighted sum (Σ) followed by a hard **threshold (step) non-linearity**.

**Q:** Give Rosenblatt's perceptron output function and its threshold activation.
**A:** **y(x) = f(wᵀφ(x))**, with the hard threshold **f(a) = +1 if a ≥ 0, −1 if a < 0**. Minsky & Papert described it as a stochastic gradient-descent algorithm that attempts to linearly separate n-dimensional training data.

**Q:** State the perceptron learning rule (weight update).
**A:** **w^(τ+1) = w^(τ) − η∇E_P(w) = w^(τ) + η·φₙ·tₙ**, where **η** is the learning-rate hyperparameter and (φₙ, tₙ) is a misclassified example.

**Q:** State the Perceptron Convergence Theorem (given / if / then).
**A:** **Given** P input patterns x(p) with targets t(p) and the perceptron learning rule (WLOG learning rate = 1): **If** there exists a weight vector w* such that f(x(p)·w*) = t(p) for all patterns (i.e. the data is linearly separable), **then** for any starting w the algorithm **converges to a correct weight vector in a finite number of update steps**.

**Q:** What are the two main limitations of the perceptron?
**A:** (1) **Convergence is finite but the number of updates may be large**; (2) it **cannot solve simple non-linearly-separable problems** — the classic example is **XOR**.

**Q:** Give the sigmoid activation and its derivative.
**A:** **f(x) = 1/(1 + e^{−mx})**, with derivative **f'(x) = m·f(x)·[1 − f(x)]** (m is a slope/gain parameter).

**Q:** Give the tanh activation and its derivative.
**A:** **h(a) ≡ tanh(a) = (eᵃ − e⁻ᵃ)/(eᵃ + e⁻ᵃ)**, with derivative **h'(a) = 1 − h(a)²**.

**Q:** State the Universal Approximation Theorem and its crucial caveat.
**A:** **One hidden layer is sufficient to approximate ANY function F to an ARBITRARY degree of accuracy.** Caveat: it does **NOT imply the ability to learn** that function — a single-hidden-layer approximator *exists*, but (a) the learning algorithm may not find it, and (b) the required hidden-layer width may be impractical. This is a **rationale for deep learning**.

**Q:** Why is minimizing an ANN cost function fundamentally harder than for logistic regression?
**A:** For ANNs the cost function E(Θ) is **non-convex** — it has **multiple extrema (local minima)** in a **vastly high-dimensional parameter space**. We still need **argmin_Θ E(Θ)**, but no simple closed-form/global guarantee exists.

**Q:** Why is XOR a canonical "hard" example, and how is XNOR related?
**A:** XOR (y = x₁ XOR x₂) is **not linearly separable** — a single perceptron cannot represent it, so it needs a **non-linear decision boundary** (a hidden layer). **XNOR = NOT(x₁ XOR x₂)**.

**Q:** How is XNOR built from the AND / OR / NOT-NOT units, and why does it need a hidden layer?
**A:** Hidden unit a₁^(2) = (x₁ AND x₂), hidden unit a₂^(2) = ((NOT x₁) AND (NOT x₂)); the output unit a₁^(3) = (a₁^(2) OR a₂^(2)) = XNOR. It requires a **hidden layer** because XNOR is **not linearly separable** — no single unit suffices.

**Q:** Define the ReLU activation and give its stated advantages.
**A:** **f(x) = max(0, x)** (x = input to the activation). Advantages: **avoids the saturation issue**, **mitigates the vanishing gradient problem**, and is the **"default recommendation" for modern feedforward ANNs** (Goodfellow, 2016).

**Q:** What is the softplus function and how does it relate to ReLU and the sigmoid?
**A:** **f(x) = log(1 + exp(x))** — a **smooth approximation of ReLU**. Its **derivative is the sigmoid**.

**Q:** Why is the sigmoid problematic as a hidden activation in deep networks, compared to ReLU?
**A:** The sigmoid **saturates** for large |x| (flat tails → derivative → 0), causing the **vanishing gradient** problem in deep nets. ReLU (and softplus) have non-saturating positive regions that keep gradients flowing.

**Q:** For binary classification with one sigmoid output, give the target distribution and the error (cost) function.
**A:** Output **y = σ(a) = 1/(1+exp(−a))**, so 0 ≤ y ≤ 1. Target follows a **Bernoulli**: p(t|x,w) = y^t (1−y)^{1−t}. The negative log-likelihood gives the **cross-entropy error**: **E(w) = − Σ_{n=1}^N { tₙ ln yₙ + (1 − tₙ) ln(1 − yₙ) }**. Cross-entropy (vs. SSE) gives **faster training and improved generalization** (Simard et al., 2003).

**Q:** For multiclass (K mutually exclusive classes), give the softmax output and the corresponding error function.
**A:** **Softmax: y_k(x,w) = exp(a_k) / Σ_j exp(a_j)** with a_k = w_kᵀφ, satisfying 0 ≤ y_k ≤ 1 and Σ_k y_k = 1; outputs interpreted as p(t_k=1|x). Targets use **1-of-K coding**. Error (categorical cross-entropy): **E(w) = − Σ_{n=1}^N Σ_{k=1}^K t_{kn} ln y_k(x_n,w)**.

### — From the books —

**Q:** Name the non-zero-slope **generalizations of ReLU**, and define the **maxout** unit.
**A:** All ReLU variants use $h_i=\max(0,z_i)+\alpha_i\min(0,z_i)$: **absolute-value** ($\alpha_i=-1$), **leaky ReLU** ($\alpha_i\approx0.01$), **PReLU** ($\alpha_i$ learnable). A **maxout** unit outputs the max over a group of $k$ linear pieces, $g(z)_i=\max_{j\in\mathbb G^{(i)}} z_j$ — it **learns a piecewise-linear convex activation** (can reproduce ReLU/abs/leaky), at the cost of $k$ weight vectors per unit. *[Goodfellow p.193–194]*

**Q:** Describe the **weight-space symmetries** of a two-layer tanh network, and what they imply about its minima.
**A:** (1) **Sign-flip**: flipping all weights+bias into a hidden unit is undone by flipping its outgoing weights (tanh is odd) → $2^M$. (2) **Interchange**: permuting the $M$ hidden units leaves the map unchanged → $M!$. Total $M!\,2^M$ equivalent weight vectors give the identical function — so a net has enormously many local minima, but the symmetry-induced ones all have **equal cost** (a harmless form of non-convexity). *[Bishop p.185–186]*

**Q:** What is the quantitative argument for why **depth beats width**?
**A:** A deep ReLU network divides input space into a number of linear regions that is **exponential in depth** but only **polynomial in width**. Representing the same function with a shallow (two-layer) network would require an **exponential number of hidden units**. *[Bishop p.187; Goodfellow p.198–200]*

---

## 4. Backprop & Computational Graphs

**Q:** Why are computational graphs important in modern deep learning?
**A:** They are of **key importance to modern neural networks and deep learning**, including enabling the **efficient training of deep networks** (they underlie automatic differentiation / backprop). A feedforward ANN can itself be drawn as a computational graph (e.g. y ← h₁,h₂ ← x₁,x₂).

**Q:** Define the **activation sum** $a_j$ and **activation (output)** $z_j$ of a unit $j$ in backprop notation.
**A:** Weighted sum: $a_j = \sum_i w_{ji} z_i$. Activation: $z_j = h(a_j)$, where $h$ is the **activation function**.

**Q:** How is the **error signal** (error) $\delta_j$ defined, and what compact formula does it give for the weight gradient?
**A:** $\delta_j \equiv \dfrac{\partial E_n}{\partial a_j}$. Since $a_j = \sum_i w_{ji}z_i$ gives $\partial a_j/\partial w_{ji}=z_i$, we get $\dfrac{\partial E_n}{\partial w_{ji}} = \delta_j z_i$. (Note: error signal $\delta$ ≠ error/cost/loss **function** $E_n$.)

**Q:** For an **output** unit $k$ (linear-output, sum-of-squares error), what is the error signal $\delta_k$?
**A:** $\delta_k = y_k - t_k$. Errors at the output are easy because we have the target values $t_k$.

**Q:** What is the back-propagation formula for the error signal $\delta_j$ at a **hidden** unit, and why is it needed?
**A:** $\delta_j = h'(a_j)\sum_k w_{kj}\,\delta_k$. Hidden layers have no target values, so we relate a hidden unit's error to the errors $\delta_k$ at the **next** layer via the chain rule, i.e., back-propagate.

**Q:** List the five basic back-propagation equations (B1)–(B5) in order.
**A:**
- (B1) $a_j = \sum_i w_{ji} z_i$
- (B2) $z_j = h(a_j)$
- (B3) $\delta_k = y_k - t_k$ (output units)
- (B4) $\delta_j = h'(a_j)\sum_k w_{kj}\delta_k$ (hidden units)
- (B5) $\dfrac{\partial E_n}{\partial w_{ji}} = \delta_j z_i$

**Q:** State the four-step basic back-propagation procedure at a high level.
**A:**
1. Apply input $\mathbf{x}_n$ and **forward-propagate** (B1, B2) to get all hidden/output activations.
2. Evaluate output errors $\delta_k$ (B3).
3. **Back-propagate** the $\delta$'s (B4) to get $\delta_j$ for each hidden unit.
4. Use (B5) to evaluate the cost-function derivatives.

**Q:** With **sigmoid** activation, what are the output-unit and hidden-unit error signals used in the worked backprop example?
**A:** Output: $\delta_k = \sigma'(a_k)(y_k - t_k) = [\sigma(a_k)(1-\sigma(a_k))](1-\sigma(a_k))$. Hidden: $\delta_j = \sigma'(a_j)\sum_k w_{kj}\delta_k = [\sigma(a_j)(1-\sigma(a_j))]\sum_k w_{kj}\delta_k$.

**Q:** Define the **Jacobian** matrix of a function $f:\mathbb{R}^m \to \mathbb{R}^n$.
**A:** $\mathbf{J}\in\mathbb{R}^{n\times m}$ with entries $J_{i,j} = \dfrac{\partial}{\partial x_j} f(\mathbf{x})_i$.

**Q:** Give the local derivatives for the three basic operation nodes: add, multiply, and max.
**A:**
- $f(x,y)=x+y$: $\partial f/\partial x = 1$, $\partial f/\partial y = 1$
- $f(x,y)=xy$: $\partial f/\partial x = y$, $\partial f/\partial y = x$
- $f(x,y)=\max(x,y)$: $\partial f/\partial x = 1\ (x\ge y)$, $\partial f/\partial y = 1\ (y\ge x)$

**Q:** State the "gradient routing" behavior at **add**, **multiply**, and **max** nodes during backprop.
**A:**
- **ADD**: distributes the output gradient **equally** to all inputs (local derivative = 1).
- **MULT**: each input's gradient = the **"switched" (other) input** times the output gradient.
- **MAX**: routes the gradient only to the input that had the **highest value** on the forward pass.

**Q:** In the worked example $f=(x+y)\cdot u$ with $x=-2,\ y=5,\ u=-4$, what are the forward values $a$ and $f$, and the gradients $\partial f/\partial u$, $\partial f/\partial x$, $\partial f/\partial y$?
**A:** Forward: $a = x+y = 3$, $f = a\cdot u = -12$. Backward (start $\partial f/\partial f=1$): $\partial f/\partial a = u = -4$, $\partial f/\partial u = a = 3$; through the add node $\partial f/\partial x = \partial f/\partial y = \partial f/\partial a = -4$.

**Q:** For $\mathbf{y}=g(\mathbf{x})$ (with $\mathbf{x}\in\mathbb{R}^m,\mathbf{y}\in\mathbb{R}^n$) and scalar $z=f(\mathbf{y})$, write the multivariate chain rule in scalar and vector form.
**A:** Scalar: $\dfrac{\partial z}{\partial x_i} = \sum_j \dfrac{\partial z}{\partial y_j}\dfrac{\partial y_j}{\partial x_i}$. Vector: $\nabla_\mathbf{x} z = \left(\dfrac{\partial \mathbf{y}}{\partial \mathbf{x}}\right)^{\!\top} \nabla_\mathbf{y} z$, where $\partial\mathbf{y}/\partial\mathbf{x}$ is the $n\times m$ **Jacobian** of $g$.

**Q:** Give the **forward-propagation** pseudocode through a deep MLP of depth $l$ (with weights $\mathbf{W}^{(k)}$, biases $\mathbf{b}^{(k)}$).
**A:**
```
h^(0) = x
for k = 1,...,l:
    a^(k) = b^(k) + W^(k) h^(k-1)
    h^(k) = f(a^(k))
ŷ = h^(l)
J = L(ŷ, y) + λΩ(θ)      # cost incl. regularization
```

**Q:** Give the **backward-propagation** pseudocode through a deep MLP (gradients on activations, weights, biases).
**A:**
```
g ← ∇_ŷ J = ∇_ŷ L(ŷ, y)
for k = l, l-1, ..., 1:
    g ← ∇_{a^(k)} J = g ⊙ f'(a^(k))          # into pre-nonlinearity
    ∇_{b^(k)} J = g + λ ∇_{b^(k)} Ω(θ)
    ∇_{W^(k)} J = g h^(k-1)ᵀ + λ ∇_{W^(k)} Ω(θ)
    g ← ∇_{h^(k-1)} J = W^(k)ᵀ g              # propagate to lower layer
```

**Q:** For `C = AB` (matmul, with $A,B,C$ tensors) and output gradient $G = \partial z/\partial C$, what gradients does `bprop` send to $A$ and $B$?
**A:** Gradient to $A$: $G B^\top$. Gradient to $B$: $A^\top G$.

### — From the books —

**Q:** Contrast **forward-mode** and **reverse-mode** automatic differentiation, and say which suits NN training.
**A:** Forward-mode augments each value with a **tangent** $\dot v_i=\partial v_i/\partial x_j$; one pass yields **one column** of the Jacobian → efficient when outputs ≫ inputs. Reverse-mode augments each value with an **adjoint** $\bar v_i=\partial f/\partial v_i$; one backward pass yields **one row** → efficient when inputs ≫ outputs. NN training has **one scalar loss and millions of parameters** ($D\gg K$), so **reverse-mode = backprop** is used. *[Bishop p.246–250]*

**Q:** Give the **cost** of backprop vs numerical differentiation in the number of weights $W$, and the **central-difference** formula.
**A:** One backprop pass gives all $\partial E_n/\partial w_{ji}$ in **$O(W)$**; numerical differentiation perturbs each of $W$ weights and re-runs an $O(W)$ forward pass → **$O(W^2)$** (used only to *check* an implementation). Central difference: $\dfrac{E_n(w+\epsilon)-E_n(w-\epsilon)}{2\epsilon}+O(\epsilon^2)$ — accuracy $O(\epsilon^2)$ vs $O(\epsilon)$ for one-sided. *[Bishop p.239]*

**Q:** List the **four ways** to evaluate a gradient and the main drawback of symbolic differentiation.
**A:** (1) **Manual** backprop, (2) **numerical** finite differences, (3) **symbolic** (computer algebra), (4) **automatic** differentiation. Symbolic differentiation suffers **"expression swell"** — e.g. $f=uv\Rightarrow f'=u'v+uv'$ duplicates sub-expressions, so derivatives can grow exponentially — and it cannot handle control flow. *[Bishop p.244–246]*

---

## 5. Optimization & Training

**Q:** How do **batch**, **on-line**, and **minibatch** learning differ in when weights are updated?
**A:**
- **Batch:** changes accumulated over all patterns; weights updated once after the **entire epoch**.
- **On-line:** weights updated after **each pattern**.
- **Minibatch:** weights updated after each **subset** (minibatch) of patterns; every pattern belongs to exactly one minibatch. Typical for deep learning.

**Q:** What is **Stochastic Gradient Descent (SGD)** and what motivates it?
**A:** SGD is gradient descent using **minibatches** (estimating the gradient from a small sample). Motivation: for additive cost functions the exact gradient is $O(m)$ per step over $m$ examples — **prohibitive for large datasets**. The gradient is an **expectation**, which can be estimated approximately from few samples — the key insight behind SGD.

**Q:** Write the SGD minibatch gradient estimate and weight-update rule.
**A:** For minibatch of $m'$ exemplars:
$$g = \frac{1}{m'}\nabla_\theta \sum_{i=1}^{m'} L(x^{(i)}, y^{(i)}, \theta), \qquad \theta \leftarrow \theta - \epsilon g$$
$m'$ is kept **fixed** even as the training set grows to billions.

**Q:** Why must the SGD learning rate be **decreased** over time, unlike full-batch GD?
**A:** The SGD gradient estimator introduces **noise from minibatch sampling that does not vanish near a minimum**. In full-batch GD the true gradient tends to 0 near a minimum, so a fixed rate is fine; in SGD you gradually decrease the rate for stability.

**Q:** State the **momentum** update rule (velocity and parameter update).
**A:**
$$v \leftarrow \alpha v - \epsilon \nabla_\theta \left(\frac{1}{m}\sum_{i=1}^m L(f(x^{(i)};\theta), y^{(i)})\right), \qquad \theta \leftarrow \theta + v$$
$v$ is the **velocity**, $\alpha$ the momentum parameter, $\epsilon$ the learning rate.

**Q:** What two optimization problems is momentum designed to mitigate?
**A:** (1) **Poor conditioning of the Hessian matrix**, and (2) **variance in the stochastic gradient**. Intuition: it prevents "overshooting" the minimum and smooths the path.

**Q:** How does **Nesterov momentum** differ from standard momentum? Give the velocity update.
**A:** The gradient is evaluated **after applying the current velocity** (at the "interim" point $\theta + \alpha v$), acting as a correction factor:
$$v \leftarrow \alpha v - \epsilon\nabla_\theta\left[\frac{1}{m}\sum_{i=1}^m L(f(x^{(i)};\theta+\alpha v), y^{(i)})\right], \qquad \theta\leftarrow\theta+v$$

**Q:** What is the core idea of **AdaGrad** (Duchi, 2011)?
**A:** Scale each parameter's learning rate **inversely proportional to the square root of the sum of all historical squared gradients**. Parameters with large partial derivatives get rapidly-decreasing rates; small-derivative parameters decrease slowly → faster progress along **gently-sloped** directions.

**Q:** Give the AdaGrad update (accumulation and parameter update).
**A:** Accumulate: $r \leftarrow r + g \odot g$. Update: $\Delta\theta \leftarrow -\dfrac{\epsilon}{\delta + \sqrt{r}}\odot g$ (division and sqrt element-wise), then $\theta \leftarrow \theta + \Delta\theta$. $\delta \approx 10^{-7}$ for numerical stability.

**Q:** What is AdaGrad's main weakness when training deep (non-convex) networks?
**A:** Because the rate is reduced by the **entire history** of squared gradients, the effective learning rate can decrease **prematurely and excessively** — it may become too small before reaching a convex (bowl) region. AdaGrad has good theory for **convex** problems but performs well only for some deep models.

**Q:** How does **RMSProp** (Hinton, 2012) modify AdaGrad, and what new hyperparameter does it add?
**A:** It changes gradient accumulation to an **exponentially-weighted moving average**, so extreme-past gradient history is exponentially discarded — letting it converge fast once a convex (bowl) region is found. New hyperparameter: **decay rate $\rho$**, controlling the moving-average length-scale.

**Q:** Give the RMSProp accumulation and parameter-update rules.
**A:** Accumulate: $r \leftarrow \rho r + (1-\rho)\, g\odot g$. Update: $\Delta\theta = -\dfrac{\epsilon}{\sqrt{\delta + r}}\odot g$ (element-wise), then $\theta \leftarrow \theta + \Delta\theta$. $\delta \approx 10^{-6}$ stabilizes division.

**Q:** What is **Adam** (Kingma & Ba, 2014) a combination of, and what are its two distinctive features?
**A:** Adam ("**adaptive moments**") combines **RMSProp and momentum**. Distinctive features: (1) momentum incorporated directly as an **exponentially-weighted estimate of the first-order moment** of the gradient (applied to rescaled gradients — no clear theoretical justification); (2) **bias corrections** to the first- and second-moment estimates to account for their initialization at the origin.

**Q:** Give Adam's biased moment updates and their bias corrections.
**A:** With $t \leftarrow t+1$:
- First moment: $s \leftarrow \rho_1 s + (1-\rho_1)g$
- Second moment: $r \leftarrow \rho_2 r + (1-\rho_2)\,g\odot g$
- Corrections: $\hat s = \dfrac{s}{1-\rho_1^t}$, $\hat r = \dfrac{r}{1-\rho_2^t}$
- Update: $\Delta\theta = -\epsilon\dfrac{\hat s}{\sqrt{\hat r}+\delta}$, then $\theta \leftarrow \theta + \Delta\theta$.

**Q:** What are Adam's suggested default hyperparameters, and what caveat does the slide give?
**A:** Step size $\epsilon = 0.001$; decay rates $\rho_1 = 0.9$, $\rho_2 = 0.999$; $\delta = 10^{-8}$. Caveat: it is robust but **beware the suggested default learning rate — it may need to be changed**.

**Q:** For a fully-connected layer with `m` inputs (fan_in) and `n` outputs (fan_out), what are the **Glorot (Xavier)** uniform and normal initializers?
**A:**
- **GlorotUniform:** $U\!\left(-\sqrt{\tfrac{6}{m+n}},\ \sqrt{\tfrac{6}{m+n}}\right)$
- **GlorotNormal:** $N\!\left(0,\ \sqrt{\tfrac{2}{m+n}}\right)$

Glorot is a **compromise** between initializing all layers to have the **same activation-variance vs. the same gradient-variance**.

**Q:** What are the **He** initialization formulas (uniform and normal) for a layer with `m` inputs?
**A:**
- **HeUniform:** $U\!\left(-\sqrt{\tfrac{6}{m}},\ \sqrt{\tfrac{6}{m}}\right)$
- **HeNormal:** $N\!\left(0,\ \sqrt{\tfrac{2}{m}}\right)$

(Depends only on fan_in `m`.)

**Q:** What core training problem does **Batch Normalization** (Ioffe & Szegedy, 2015) address?
**A:** In deep networks, the **distribution of each layer's inputs changes during training** as the parameters of previous layers change. This slows training (forces lower learning rates and careful init) and makes training with **saturating nonlinearities** hard. BN normalizes layer inputs as part of the architecture, done per minibatch.

**Q:** Give the Batch Normalization normalization formula, including how mean, standard deviation, and the stability constant are computed.
**A:** Replace H with $H' = \dfrac{H-\mu}{\sigma}$ where
$\mu = \tfrac{1}{m}\sum_i H_{i,:}$ (vector of unit means) and
$\sigma = \sqrt{\delta + \tfrac{1}{m}\sum_i (H-\mu)_i^2}$ (vector of unit std devs).
$\delta$ is a small constant (e.g. $10^{-8}$) for **numerical stability**. All arithmetic is **element-wise** (each $H_{i,j}$ normalized by $\mu_j$ and $\sigma_j$), over a minibatch arranged as a design matrix (one example per row).

**Q:** After normalizing, BN reparametrizes activations. What is the parametrized form and what do the parameters do?
**A:** $\gamma \odot H' + \beta$, where **γ = scale** parameters and **β = shift (offset)** parameters, both **learned at train-time via backprop**. Reason: normalizing mean/std can reduce the expressive power of the network; the learnable γ, β restore it.

**Q:** What problem motivated **ResNet** (He et al.), and how does a residual/shortcut module solve it?
**A:** The **degradation problem**: performance (even training error) degrades as network depth increases. ResNet uses **shortcut modules with identity connections**: the module output is $\mathcal{F}(x) + x$. The shortcut learns $F(x) = H(x) - x$ instead of the full mapping $H(x)$. **Initially $F(x)=0$** so the identity connection is taken; during training the actual forward path through the weight layers is gradually used.

### — From the books —

**Q:** In the local quadratic model, how does gradient descent evolve along each Hessian eigenvector, and what learning-rate bound results?
**A:** Along eigenvector $\mathbf{u}_i$ (eigenvalue $\lambda_i$), the distance to the minimum evolves as $\alpha_i^{(T)} = (1-\eta\lambda_i)^T \alpha_i^{(0)}$. Convergence needs $|1-\eta\lambda_i|<1$ for all $i$, i.e. **$\eta < 2/\lambda_{\max}$**; it is **linear**, with speed set by the smallest direction. *[Bishop p.219]*

**Q:** Define the **condition number** of the Hessian and give momentum's effect on the effective learning rate.
**A:** Condition number $=\lambda_{\max}/\lambda_{\min}$; when large, the error contours are elongated ellipses and progress is **extremely slow** (the "long valley"). In a low-curvature region, momentum sums a geometric series to give effective step $-\dfrac{\eta}{1-\mu}\nabla E$ — multiplying the learning rate by $\dfrac{1}{1-\mu}$ (typical $\mu=0.9$); in oscillatory regions the momentum terms cancel. *[Bishop p.220]*

**Q:** In high-dimensional non-convex optimization, why do **saddle points** dominate over local minima, and what is the Hessian like at one?
**A:** At a saddle point the Hessian has **both positive and negative eigenvalues**. Modeling each eigenvalue's sign as a coin flip, an all-positive Hessian (a local min) needs "all heads," which is exponentially unlikely as dimension $n$ grows — so the **ratio of saddle points to minima grows exponentially with $n$**. Low-cost critical points tend to be minima; high-cost ones tend to be saddles. *[Goodfellow p.285–286]*

**Q:** Contrast **batch normalization** and **layer normalization** — what is averaged over, and how does each behave at inference?
**A:** **Batch norm** computes mean/variance **across the mini-batch, per hidden unit**; it needs stored training-time **moving averages** for inference and degrades with small/split batches. **Layer norm** computes mean/variance **across the hidden units, per data point**; the **same function is used at train and test** (no stored stats), which suits RNNs and transformers. Both add learnable per-unit $\gamma_i,\beta_i$. *[Bishop p.227–229]*

---

## 6. CNNs & Architectures

**Q:** Why is "naive" use of an MLP (pixel intensities fed row-after-row) inadequate for non-trivial image tasks?
**A:** Two issues: (1) **non-robustness to shifts, scaling, and distortions**, and (2) it **ignores the spatial structure** in image data.

**Q:** How do CNNs differ fundamentally from the traditional hand-crafted-feature pipeline (e.g., SIFT/HOG)?
**A:** CNNs use **raw input data directly** and **dispense with the feature-extraction stage** — no "feature engineering" / no human-designed features. Multiple layers learn low-level → mid-level → object-ID representations that are **increasingly invariant**.

**Q:** Give the 2D discrete convolution formula and name each term in CNN terminology.
**A:** $S(i,j) = (I * K)(i,j) = \sum_m \sum_n I(m,n)\,K(i-m, j-n)$. Here $S$ = **feature map**, $I$ = **input**, $K$ = **kernel (filter)**.

**Q:** What are the four roles/benefits of convolution in a CNN?
**A:** (1) **Sparse interactions**, (2) **parameter sharing**, (3) **equivariant representations**, and (4) a **mechanism for variable-size inputs**.

**Q:** Explain **sparse interactions** in CNNs and the parameter/complexity savings vs. a fully-connected layer.
**A:** A fully-connected layer with $m$ inputs, $n$ outputs uses $m\times n$ parameters, $O(m\times n)$ per example. A CNN kernel is **smaller than the input**, so each output connects to only $k$ inputs → $k\times n$ parameters, $O(k\times n)$ runtime. With $k \ll m$ this saves memory, improves statistical efficiency, and needs fewer operations.

**Q:** If direct connectivity in a CNN is sparse, how can deep-layer units still "see" most of the input?
**A:** The **receptive field grows with depth** — deeper-layer units are connected (indirectly) to all or most of the inputs. Architectural features like **stride and pooling** compound this effect.

**Q:** Explain **parameter sharing** in a CNN vs. a fully-connected layer.
**A:** In a CNN the same kernel parameter (e.g. the central weight of a $k=3$ kernel) is **shared across all input positions**, so it is reused many times. In a fully-connected ($w^\top x$) layer each parameter is **used only once**.

**Q:** For a $32\times32\times3$ input image, what depth must a $5\times5$ kernel have, and why?
**A:** The kernel must be $5\times5\times\mathbf{3}$ — its **depth must equal the input depth** (3). Convolution slides spatially (height/width); the depth dimension is matched, and a dot product $w^\top x + w_0$ (with bias) is computed over the full $5\times5\times3$ region.

**Q:** For a $32\times32\times3$ input convolved with one $5\times5\times3$ kernel (stride 1, no padding), what is the size of the resulting **activation map**?
**A:** $28\times28\times1$. The activation (feature) map has as many elements as the number of "fits" of the kernel into the image.

**Q:** How do you obtain **multiple activation maps** in a convolution layer?
**A:** Use **multiple kernels**, each with **different weights**. Each kernel produces one activation map; stacking them gives several activation maps (the output depth = number of kernels).

**Q:** Contrast **locally-connected**, **convolution**, and **fully-connected** layers on connectivity restriction and parameter sharing.
**A:**
- **Locally connected:** restricted connectivity, **no** parameter sharing.
- **Convolution:** same connectivity restriction, **with** parameter sharing.
- **Fully connected:** no connectivity restriction, no parameter sharing.

**Q:** What is **stride** in a convolution, and what is one effect of increasing it?
**A:** Stride $s$ is the step size by which the kernel moves across the input (in height and width). Larger stride skips positions, producing a **smaller output** (downsampling effect).

**Q:** What is **pooling**, what two operations are common, and what does it contribute?
**A:** Pooling **combines information from adjacent locations** (conveying neighborhood info rather than individual elements). Common ops: **max** or **average**. It contributes **approximate invariance to small translations**, and makes representations smaller (efficiency).

**Q:** Work the example: **max pooling** with a $2\times2$ kernel and stride 2 on $\begin{smallmatrix}5&2&4&9\\8&1&2&6\\3&5&7&2\\4&2&3&1\end{smallmatrix}$.
**A:** Take the max in each non-overlapping $2\times2$ block → $\begin{smallmatrix}8&9\\5&7\end{smallmatrix}$.

**Q:** What is **zero padding** used for, and what happens to spatial size without it?
**A:** Zero padding controls layer size and **prevents spatial dimensions from shrinking** during convolution. Without padding, each layer shrinks by (**Kernel_Width − 1**) pixels; with zero padding, the representation does not shrink with depth.

**Q:** How does **AlexNet** (Krizhevsky, Sutskever, Hinton, NIPS 2012) differ from LeCun's 1998 framework?
**A:** Same general framework but: a **bigger model** (7 hidden layers, ~650,000 units, ~60,000,000 parameters), **more data** ($10^6$ vs $10^3$ images), and **GPU implementation** (~50× speedup over CPU, trained on two GPUs for about a week).

**Q:** What is the defining structural characteristic of **VGGNet**?
**A:** A deep CNN built almost entirely from stacked **3×3 conv** layers with periodic **pool /2** downsampling, doubling channel depth across stages (64 → 128 → 256 → 512), ending in **fc 4096 → fc 4096 → fc 1000**. Spatial output size shrinks 224 → 112 → 56 → 28 → 14 → 7 → 1.

**Q:** What is the basic building block of **Inception (Inception-v4)** grid modules, and what is the role of 1×1 convolutions?
**A:** An Inception module runs several parallel branches (e.g., 1×1 conv, 3×3 conv, avg-pooling paths) whose outputs are combined by **filter concatenation**. **1×1 convs** are used within branches (dimensionality/channel management) before larger convs. Inception-v4 overall: Stem → 4× Inception-A → Reduction-A → 7× Inception-B → Reduction-B → 3× Inception-C → Avg Pooling → Dropout (keep 0.8) → Softmax (input 299×299×3).

### — From the books —

**Q:** What is the difference between **convolution** and **cross-correlation**, and which do libraries implement?
**A:** True convolution **flips** the kernel: $S(i,j)=\sum_m\sum_n I(m,n)K(i-m,j-n)$ (commutative). **Cross-correlation** omits the flip: $S(i,j)=\sum_m\sum_n I(i+m,j+n)K(m,n)$. Most ML libraries implement **cross-correlation but call it convolution** — it doesn't matter, since the kernel is *learned* in whatever orientation is used. *[Goodfellow p.332–333]*

**Q:** Give the **output size** and **parameter count** for a conv layer, including the valid/same/full padding cases.
**A:** For input $J\times K$ convolved (valid, stride 1) with an $M\times M\times C$ multi-channel filter: output $(J-M+1)\times(K-M+1)$; one filter has $M^2C$ weights **+1 bias**, and a layer with $C_{\text{out}}$ filters has $(M^2C+1)C_{\text{out}}$ params (independent of image size). Padding (width $m$, kernel $k$): **valid** → $m-k+1$; **same** → $m$; **full** → $m+k-1$. *[Bishop p.295–296; Goodfellow p.349]*

**Q:** What is a **1×1 convolution**, and what is the difference between **equivariance** and **invariance** in a CNN?
**A:** A **1×1 conv** has a single-pixel filter ($C$ weights + bias per filter); it changes the **number of channels** without changing spatial size. Convolution is **translation-equivariant** (shift the input ⇒ the feature map shifts correspondingly — position tracked); **pooling** adds local translation **invariance** (small shifts leave the pooled output ~unchanged — position partly discarded). *[Bishop p.291, 296–297]*

---

## 7. Sequence Models & Attention

**Q:** Write the full set of forward equations for the "basic" RNN (input-to-hidden $U$, hidden-to-hidden $W$, hidden-to-output $V$).
**A:**
- $a^{(t)} = b + W h^{(t-1)} + U x^{(t)}$
- $h^{(t)} = \tanh(a^{(t)})$
- $o^{(t)} = c + V h^{(t)}$
- $\hat{y}^{(t)} = \text{softmax}(o^{(t)})$

**Q:** What is **BPTT (Back-propagation Through Time)**?
**A:** **Back-propagation applied to the unfolded RNN computational graph** — gradients are propagated backward through time from $t=\tau-1$ down to $t=1$.

**Q:** In BPTT, write the recursion for $\nabla_{h^{(t)}} L$ that back-propagates gradients through time.
**A:** $\nabla_{h^{(t)}} L = W^\top (\nabla_{h^{(t+1)}} L)\,\text{diag}\!\big(1 - (h^{(t+1)})^2\big) + V^\top (\nabla_{o^{(t)}} L)$. The $\text{diag}(1-(h^{(t+1)})^2)$ is the **Jacobian of $\tanh$**. At the final step: $\nabla_{h^{(\tau)}} L = V^\top \nabla_{o^{(\tau)}} L$.

**Q:** Why do RNNs suffer from **vanishing or exploding gradients** over long-term dependencies?
**A:** Gradients propagated over many stages involve **multiplication of many Jacobians**, giving **exponentially smaller (or larger) weights** for long-term interactions — so gradients vanish or explode.

**Q:** What is the **Encoder-Decoder (sequence-to-sequence) RNN** architecture, and what is the **context variable C**?
**A:** An **encoder RNN** maps an input sequence $(x^{(1)},\dots,x^{(N_x)})$ to a **context variable C** — a (generally fixed-size) **semantic summary** of the input — and a **decoder RNN** generates the output sequence $(y^{(1)},\dots,y^{(N_y)})$ from C. Key advantage: **no restriction that input and output sequence lengths match**.

**Q:** Describe a **Bidirectional RNN (Bi-RNN)** and what advantage it provides.
**A:** It runs two recurrences: **$h$ propagates information forward** in time/sequence and **$g$ propagates information backward**. At each point $t$, output $o^{(t)}$ can use relevant summaries of **both the past (via $h^{(t)}$) and the future (via $g^{(t)}$)**. Outputs of the forward/backward passes are **concatenated**.

**Q:** What is an **LSTM**, and what two state-vectors does an LSTM cell maintain?
**A:** LSTM (**Long Short-Term Memory**) is a **network of gated cells** with recurrences both between cells and within a cell. Each cell has **two state-vectors**: **c — the cell state** and **h — the hidden state**.

**Q:** Name the LSTM cell's four gate/candidate components and the nonlinearity used by the gates.
**A:** **Forget gate f**, **input gate i**, **output gate o**, and the **update candidate g**. The **gating units use a sigmoid** nonlinearity (to allow or extinguish the entity they control); g uses $\tanh$.

**Q:** Write the LSTM gate equations (vectorized form) for input, forget, and output gates.
**A:**
- Input gate: $i = \sigma(x_j W^{xi} + h_{j-1} W^{hi})$
- Forget gate: $f = \sigma(x_j W^{xf} + h_{j-1} W^{hf})$
- Output gate: $o = \sigma(x_j W^{xo} + h_{j-1} W^{ho})$

**Q:** Write the LSTM update-candidate, cell-state, and hidden-state equations.
**A:**
- Update candidate: $g = \tanh(x_j W^{xg} + h_{j-1} W^{hg})$
- Cell state: $c_j = c_{j-1} \odot f + g \odot i$
- Hidden state: $h_j = \tanh(c_j) \odot o$

($\odot$ = elementwise product.)

**Q:** In the LSTM cell, what role does the **forget gate** play with respect to the cell state, and why is this important for long-term memory?
**A:** The forget gate $f$ controls a **linear self-loop** on the cell state ($c_j = c_{j-1}\odot f + \dots$). Because the self-loop is **linear (gated additive)**, it lets information persist across many steps without the multiplicative gradient decay of a plain RNN — mitigating vanishing gradients.

**Q:** What is a **GRU**, and how does it differ from an LSTM in gates and state?
**A:** GRU (**Gated Recurrent Unit**) is a **simplified LSTM**. Differences: a **single gating unit — the update gate $u$ (or $z$)** — controls both forgetting and input gating (instead of separate forget + input gates); a **single state-vector $h$** (instead of LSTM's $c$ and $h$); plus a **reset gate $r$** controlling how much of the previous state affects the main layer.

**Q:** State the three motivations ("why") for the **attention mechanism**.
**A:** (1) Take the **entire encoder context** into account; (2) **update context dynamically** during decoding; (3) keep context a **fixed-size vector**.

**Q:** How are attention scores turned into weights $\alpha_{ij}$?
**A:** By **softmax** over all encoder states $j$: $\alpha_{ij} = \text{softmax}\big(score(h_{i-1}^d, h_j^e)\big) = \dfrac{\exp(score(h_{i-1}^d, h_j^e))}{\sum_k \exp(score(h_{i-1}^d, h_k^e))}$. The $\alpha_{ij}$ express the **proportional relevance** of each encoder state $j$ to decoder state $i$.

**Q:** Write the attention context-vector equation.
**A:** $c_i = \sum_j \alpha_{ij}\, h_j^e$ — a **weighted average over all encoder hidden states**, using the attention weights $\alpha_{ij}$, computed for the current decoder state.

**Q:** What is the central claim of "Attention is all you need" (Vaswani et al., 2017) and how does the Transformer differ architecturally from RNNs?
**A:** Use **only point-wise processing AND attention** — **no recurrent units or convolutions**. Result: faster to train, higher accuracy. It is the basis of current generative AI (GPT, LaMDA, etc.).

**Q:** What is **self-attention** and what role does it replace?
**A:** Self-attention (intra-attention) **captures context within a sequence**, relating different positions of a single sequence to compute a representation of it. It **subsumes the role played by recurrence in RNNs**, and can be computed for all sequence elements **in parallel** (no sequentiality).

**Q:** Each input plays three roles in the attention process. Name them and what each means.
**A:**
- **QUERY:** the input as the **current focus of attention**, being compared to all other preceding inputs.
- **KEY:** a **preceding input being compared** to the current focus of attention.
- **VALUE:** the value **used to compute the output** for the current focus of attention.

**Q:** Given input vectors $x_i$ (of dimension $d_m$), how are the query, key, and value vectors produced?
**A:** By linear transformations with learned weight matrices:
$q_i = W^Q x_i$, $\ k_i = W^K x_i$, $\ v_i = W^V x_i$.
(Query params $W_Q/W^Q$, key params $W_K/W^K$, value params $W_V/W^V$.)

**Q:** Write the **scaled dot-product attention** equations (similarity, attention weights, output).
**A:**
- Similarity: $E_{i,j} = \dfrac{Q_i \cdot K_i}{\sqrt{D}}$, i.e. $E = \dfrac{QK^T}{\sqrt{D}}$, where **D is the dimensionality of the keys**.
- Attention weights: $A = \text{softmax}(E,\ \dim=1)$.
- Output: $Y_i = \sum_j A_{i,j} V_j$.
Also $K = XW_K$, $V = XW_V$.

**Q:** Why divide the dot products by $\sqrt{D}$ in attention?
**A:** $D$ is the dimensionality of the keys; dividing by $\sqrt{D}$ **scales** the dot-product scores (scaled dot-product attention) before the softmax so magnitudes don't grow with dimension.

**Q:** What is a **causal / masked** self-attention layer and how is masking implemented?
**A:** **Causal** = attend only to inputs **up to and including the current one** (left-to-right); the decoder should **not "look ahead"** in the output sequence. Implemented by setting the pre-softmax scores $E$ for future positions to **$-\infty$**, so after softmax those attention weights become **0**.

**Q:** Distinguish the three attention mechanisms in a Transformer: encoder self-attention, decoder self-attention, and encoder-decoder attention.
**A:**
- **Encoder self-attention:** Q, K, V all come from the previous encoder layer.
- **Decoder self-attention:** like encoder self-attention but **values for future decoder outputs are masked out**.
- **Encoder-decoder attention:** **queries** come from the previous decoder layer; **keys and values** come from the encoder output.

**Q:** Write the two equations for a Transformer block with a single self-attention layer (the "Add & Normalize" structure).
**A:**
$z = \text{LayerNorm}(x + \text{SelfAttn}(x))$
$y = \text{LayerNorm}(z + \text{FFNN}(z))$
(Residual connection + layer normalization around both the self-attention and the feedforward sublayers.)

**Q:** Give the **LayerNorm** formulas (mean, std, normalization, final form).
**A:** For $d_h$ units in the layer:
$\mu = \tfrac{1}{d_h}\sum_{i=1}^{d_h} x_i$, $\quad \sigma = \sqrt{\tfrac{1}{d_h}\sum_{i=1}^{d_h}(x_i-\mu)^2}$,
$\hat{x} = \dfrac{x-\mu}{\sigma}$, $\quad \text{LayerNorm} = \gamma\hat{x} + \beta$ (learnable γ, β).

**Q:** Why are **positional encodings** needed, what property must they have, and what are the sinusoidal formulas?
**A:** They **capture sequentiality without recurrence** (no RNN). They have the **same dimensionality as the input vectors** and are **added** to them; can be predefined or learned. Predefined sinusoidal form:
$PE_{(pos,2i)} = \sin\!\big(pos/10000^{2i/d_{model}}\big)$
$PE_{(pos,2i+1)} = \cos\!\big(pos/10000^{2i/d_{model}}\big)$
(pos = position, i = dimension index.)

**Q:** What problem does **multi-head attention** solve, and how is it structured?
**A:** Sequence elements can relate to each other in many different ways **simultaneously**; a single self-attention layer struggles to learn these parallel relationships (averaging inhibits it). Solution: multiple **heads** = parallel self-attention layers at the same depth, **each with its own parameters**, so each head learns different aspects/representation subspaces of the relationships.

**Q:** Name the three Transformer modes, whether each has a causality restriction, and a typical use/example model.
**A:**
- **Encoder-Decoder:** seq-to-seq, e.g. **machine translation** (original Transformer, T5).
- **Encoder-only:** encoding, **no causality restriction**, e.g. classification (**BERT** and variants).
- **Decoder-only:** decoding, **causal/autoregressive**, e.g. language modeling (**GPT, LaMDA**).

**Q:** What is **softmax with temperature** and what does the temperature $\tau$ do?
**A:** $y = \text{softmax}(u/\tau)$. **Increasing $\tau$ flattens** the distribution (more uniform); **low $\tau$** facilitates greedy sampling (top candidate wins). E.g., at $\tau=0.1$ the top logit dominates (~.95); at $\tau=100$ all outcomes ≈ uniform (.25 each).

**Q:** Explain **LoRA (Low-Rank Adaptation)**: what is trained, the formula, and its advantages.
**A:** **Freeze** pretrained W; finetune by training a **pair of matrices A and B** (instead of W), then sum: $h = xW + xAB$. Here A is N×r and B is r×d (low rank r).
Advantages: **no inference runtime impact** since AB is simply added to W (dim(W)=dim(AB)); can adapt to multiple domains by building domain-specific AB and **swapping AB while keeping W unchanged**.

### — From the books —

**Q:** Starting from parameter-free attention $\mathbf{Y}=\mathrm{Softmax}[\mathbf{XX}^\top]\mathbf{X}$, why is a single shared matrix $\mathbf{U}$ inadequate, and what fixes it?
**A:** $\mathbf{XX}^\top$ has **no learnable parameters**. Using one $\mathbf{U}$ makes the score matrix $\mathbf{XUU}^\top\mathbf{X}^\top$ **symmetric**, but attention should be **asymmetric** (e.g. "chisel"→"tool" strong, "tool"→"chisel" weak) and it reuses $\mathbf{U}$ for scores and values. Fix: three **independent** matrices $\mathbf{Q}=\mathbf{XW}^{(q)}$, $\mathbf{K}=\mathbf{XW}^{(k)}$, $\mathbf{V}=\mathbf{XW}^{(v)}$, giving $\mathbf{Y}=\mathrm{Softmax}[\mathbf{QK}^\top]\mathbf{V}$. *[Bishop p.362–364]*

**Q:** Justify the $\sqrt{D_k}$ scaling in scaled dot-product attention via a variance argument.
**A:** If query and key elements are independent with zero mean and unit variance, each dot product $\mathbf{q}\cdot\mathbf{k}$ has variance $D_k$. Dividing by $\sqrt{D_k}$ restores unit-scale logits, keeping the softmax out of its saturated, tiny-gradient regime: $\mathbf{Y}=\mathrm{Softmax}\!\big[\tfrac{\mathbf{QK}^\top}{\sqrt{D_k}}\big]\mathbf{V}$. *[Bishop p.366]*

**Q:** Give the computational complexity of a self-attention layer versus an equivalent fully-connected map (parameters and compute).
**A:** Attention maps $N$ vectors of length $D$ to $N$ of length $D$. A fully-connected map over the whole $ND$ input needs $\mathcal{O}(N^2D^2)$ params and compute. Self-attention **shares** $\mathbf{W}^{(q)},\mathbf{W}^{(k)},\mathbf{W}^{(v)}$ across tokens: **parameters $\mathcal{O}(D^2)$** and **compute $\mathcal{O}(N^2D)$** (the $N^2$ from the $\mathbf{QK}^\top$ products). *[Bishop p.370]*

**Q:** Why is a transformer **permutation-equivariant**, and what is the consequence?
**A:** $\mathbf{W}^{(q)},\mathbf{W}^{(k)},\mathbf{W}^{(v)}$ and the shared MLP are applied identically to every token, so permuting the input rows permutes the output rows the same way — the model is **blind to token order**. Consequence: "good, not bad" and "bad, not good" would encode identically, so **positional encodings must be injected**. *[Bishop p.371]*

**Q:** Why does each transformer layer include a position-wise MLP after the attention sublayer?
**A:** Attention outputs are **linear combinations of the value vectors**, and values are linear in the inputs, so an attention layer's outputs are confined to the **subspace spanned by the inputs** (nonlinearity enters only through the softmax weights). A shared nonlinear $\mathrm{MLP}[\cdot]$ (two FC layers + ReLU), applied identically per token, **restores full nonlinear expressiveness**. *[Bishop p.368–369]*

**Q:** Contrast **post-norm** and **pre-norm** transformer layers.
**A:** Post-norm normalizes **after** the residual add: $\mathbf{Z}=\mathrm{LayerNorm}[\mathbf{Y}(\mathbf{X})+\mathbf{X}]$. Pre-norm normalizes **before** the sublayer: $\mathbf{Z}=\mathbf{Y}(\mathbf{X}')+\mathbf{X}$ with $\mathbf{X}'=\mathrm{LayerNorm}[\mathbf{X}]$. Pre-norm typically gives more stable optimization; both preserve the $N\times D$ shape. *[Bishop p.369]*

**Q:** How are words turned into vectors via a **word-embedding** matrix, and what does **word2vec** learn?
**A:** For a one-hot $\mathbf{x}_n$, the embedding is $\mathbf{v}_n=\mathbf{E}\mathbf{x}_n$ (a column of the $D\times K$ matrix $\mathbf{E}$). **word2vec** learns $\mathbf{E}$ self-supervised over a context window: **CBOW** predicts the middle word from its context; **skip-gram** predicts context from the middle word. The space supports arithmetic, e.g. $\mathbf{v}(\text{Paris})-\mathbf{v}(\text{France})+\mathbf{v}(\text{Italy})\simeq\mathbf{v}(\text{Rome})$. *[Bishop p.375–376]*

**Q:** What problem does **tokenization** solve, and how does **byte-pair encoding (BPE)** build a vocabulary?
**A:** Word-level dictionaries can't handle out-of-vocabulary/misspelled words; character-level discards word structure. **Subword tokens** are the compromise. BPE starts from individual characters and **iteratively merges the most frequent adjacent token pair** (not across a leading whitespace) until the vocabulary hits the target size — common words stay whole, rare words split into fragments. *[Bishop p.377]*

**Q:** *(RNN)* What is **teacher forcing**, from which criterion does it arise, and what train/test problem does it create?
**A:** Teacher forcing feeds the **ground-truth** $y^{(t)}$ (not the model's own $o^{(t)}$) as input at step $t{+}1$. It comes directly from the **maximum-likelihood** factorization $\log p(y^{(1)},y^{(2)}\mid\cdots)=\log p(y^{(2)}\mid y^{(1)},\cdots)+\log p(y^{(1)}\mid\cdots)$. Problem: at **test time** the true output is unavailable, so the model's own (possibly poor) outputs are fed back — an input distribution it never saw in training (mitigated by curriculum / mixing free-running inputs). *[Goodfellow p.381–383]*

---

## 8. Generative & Graph Models

**Q:** What is an **autoencoder**, and what are the encoder/decoder maps?
**A:** A network that maps input **x** through a **hidden layer (code) h** via encoder $f$ and back to a **reconstruction r** via decoder $g$. In a **stochastic autoencoder**, encoder and decoder are probabilistic: $p_{encoder}(h \mid x)$ and $p_{decoder}(x \mid h)$.

**Q:** What is a **denoising autoencoder** and its loss?
**A:** A corruption process **C** introduces noise, mapping x to a corrupted $\tilde{x}$ (via $C(\tilde{x}\mid x)$); the autoencoder encodes $\tilde{x}$ (h = f($\tilde{x}$)) and reconstructs the **clean** x. Loss: $L = -\log p_{decoder}(x \mid h = f(\tilde{x}))$.

**Q:** What is the goal of a **deep generative model**, and what is the difference between explicit and implicit density estimation?
**A:** Goal: learn $p_{model}(x)$ that approximates the data distribution $\hat{p}_{data}(x)$, then **sample** new $x'$ from $p_{model}$.
- **Explicit** density estimation: define and solve for $p_{model}$.
- **Implicit:** learn a model that can **sample from** $p_{model}$ without defining $p_{model}$ explicitly.

**Q:** What are the two competing networks in a **GAN** (Goodfellow, 2014) and their goals?
**A:**
- **Generator** ($\theta^{(g)}$): takes **noise** and produces **fake data** $x = g(z; \theta^{(g)})$; goal is to **"trick" the discriminator**.
- **Discriminator** ($\theta^{(d)}$): given real or fake data, decides **"real or fake?"**; goal is to **tell real from fake** (not get tricked).

**Q:** Write the full GAN minimax objective in terms of $D$, $G$, and $z$.
**A:**
$\arg\min_{\theta_g}\max_{\theta_d}\Big[\mathbb{E}_{x\sim p_{data}}\log D_{\theta_d}(x) + \mathbb{E}_{z\sim p(z)}\log\big(1 - D_{\theta_d}(G_{\theta_g}(z))\big)\Big]$.

**Q:** In practice, how is GAN training done, and why is the generator's objective changed from the "naive" one?
**A:** Alternate: **gradient ascent on the discriminator**, then update the generator.
- Naive generator step: $\min_{\theta_g}\mathbb{E}_{z}\log(1 - D_{\theta_d}(G_{\theta_g}(z)))$ — **not effective in practice** (weak gradients).
- Better in practice: **gradient ascent** on $\max_{\theta_g}\mathbb{E}_{z}\log(D_{\theta_d}(G_{\theta_g}(z)))$ — a different objective giving stronger gradients.

**Q:** What is a **structured probabilistic (graphical) model** and why is it used?
**A:** ML involves probability distributions over very large numbers of random variables, but **direct interactions often occur only between relatively few variables**. Instead of one single function for p, a structured probabilistic model uses a **graph G(V,E)** to describe which random variables in p **interact directly**, splitting p into factors.

**Q:** Give the general factorization formula for a **directed graphical model**.
**A:** $p(\mathbf{x}) = \prod_i p\!\left(\mathbf{x}_i \mid Pa_{\mathcal{G}}(\mathbf{x}_i)\right)$, where $Pa_{\mathcal{G}}(\mathbf{x}_i)$ are the **parents** of $\mathbf{x}_i$ in G. This is **normalized** (each factor is a conditional probability).

**Q:** Give the general factorization formula for an **undirected graphical model** and name its components.
**A:** $p(\mathbf{x}) = \dfrac{1}{Z}\prod_i \phi^{(i)}\!\left(\mathcal{C}^{(i)}\right)$, where each $\phi^{(i)}$ is a **factor for clique $\mathcal{C}^{(i)}$** (unnormalized), and **Z is the partition function** (normalizer).

**Q:** Define a **first-order Markov chain** and give its factorization.
**A:** $\mathbf{x}_n$ depends **only on the previous element** $\mathbf{x}_{n-1}$: $p(\mathbf{x}_n \mid \mathbf{x}_1,\dots,\mathbf{x}_{n-1}) = p(\mathbf{x}_n \mid \mathbf{x}_{n-1})$. Full joint: $p(\mathbf{x}_1,\dots,\mathbf{x}_N) = p(\mathbf{x}_1)\prod_{n=2}^{N} p(\mathbf{x}_n \mid \mathbf{x}_{n-1})$.

**Q:** What is a **state-space model** (Markov chain of latent variables), including its key conditional-independence property and joint factorization?
**A:** Observations $\mathbf{x}_i$ are generated from **latent variables** $\mathbf{z}_i$ (possibly different type/dimension). Key property: $\mathbf{z}_{n+1} \perp\!\!\!\perp \mathbf{z}_{n-1} \mid \mathbf{z}_n$. Joint:
$p(\mathbf{x}_{1:N}, \mathbf{z}_{1:N}) = p(\mathbf{z}_1)\left[\prod_{n=2}^{N} p(\mathbf{z}_n \mid \mathbf{z}_{n-1})\right]\prod_{n=1}^{N} p(\mathbf{x}_n \mid \mathbf{z}_n)$.

### — From the books —

**Q:** State the **ELBO** identity underlying the VAE and why $\mathcal{L}$ is a lower bound on the log-likelihood.
**A:** For any $q(\mathbf{z})$: $\ln p(\mathbf{x}\mid\mathbf{w}) = \mathcal{L}(\mathbf{w}) + \mathrm{KL}\!\big(q(\mathbf{z})\,\|\,p(\mathbf{z}\mid\mathbf{x},\mathbf{w})\big)$, with $\mathcal{L}(\mathbf{w}) = \int q(\mathbf{z})\ln\dfrac{p(\mathbf{x}\mid\mathbf{z},\mathbf{w})p(\mathbf{z})}{q(\mathbf{z})}\,d\mathbf{z}$. Since $\mathrm{KL}\ge 0$, $\ln p(\mathbf{x}\mid\mathbf{w}) \ge \mathcal{L}$ — the "evidence **lower** bound"; the gap is exactly the KL between approximate and true posteriors. *[Bishop p.570–571]*

**Q:** State the **reparameterization trick**: what problem it solves and its formula.
**A:** Directly sampling $\mathbf{z}\sim q(\mathbf{z}\mid\mathbf{x},\boldsymbol\phi)$ blocks backprop into the encoder (the sample has no derivative w.r.t. $\boldsymbol\phi$). Instead draw $\epsilon\sim\mathcal{N}(0,1)$ and set $z_{nj} = \mu_j(\mathbf{x}_n,\boldsymbol\phi) + \sigma_j(\mathbf{x}_n,\boldsymbol\phi)\,\epsilon_{nj}$, making $\mathbf{z}$ a **differentiable function of $\boldsymbol\phi$** so gradients flow (continuous variables only). *[Bishop p.574–575]*

**Q:** Write the full **VAE training loss** for a diagonal-Gaussian encoder and unit-Gaussian prior, naming each term.
**A:** $\displaystyle \mathcal{L} = \sum_n\Big\{\underbrace{\tfrac12\sum_{j=1}^M\big(1 + \ln\sigma_{nj}^2 - \mu_{nj}^2 - \sigma_{nj}^2\big)}_{-\,\mathrm{KL}(q\,\|\,\text{prior}),\ \text{analytic}} + \underbrace{\tfrac1L\sum_{l=1}^L \ln p(\mathbf{x}_n\mid\mathbf{z}_n^{(l)},\mathbf{w})}_{\text{reconstruction (MC, usually }L=1)}\Big\}$, maximized over encoder $\boldsymbol\phi$ and decoder $\mathbf{w}$ by SGD (reconstruction uses reparameterized samples). *[Bishop p.574–575]*

**Q:** For a fixed generator, what is the **optimal GAN discriminator**, and which divergence does GAN training then minimize?
**A:** $d^\star(\mathbf{x}) = \dfrac{p_{\text{data}}(\mathbf{x})}{p_{\text{data}}(\mathbf{x}) + p_G(\mathbf{x})}$. Substituting it, the generator objective becomes $C(p_G) = -\ln 4 + 2\,\mathrm{JS}(p_{\text{data}}\,\|\,p_G)$ — it minimizes the **Jensen–Shannon divergence** (symmetric, $\ge 0$, zero iff $p_G=p_{\text{data}}$). *[Bishop p.544]*

**Q:** What does a **linear undercomplete autoencoder** with MSE loss learn, and why is this notable?
**A:** It learns to span the **same subspace as PCA** — copying the input recovers the principal subspace as a side-effect. This is why nonlinear autoencoders are called a **nonlinear generalization of PCA** (an AE with code dim < input dim is "undercomplete," forcing it to capture the most salient features). *[Goodfellow p.503]*
